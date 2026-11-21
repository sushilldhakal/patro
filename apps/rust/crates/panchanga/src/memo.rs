//! A bounded, process-wide memo: least-recently-used entries are dropped once it is full.
//!
//! The server memoizes results that never change for their key (a year's festivals
//! at a location, a lunar year). Keyed by location, an unbounded map grows with every
//! new set of coordinates for the life of the process; this one keeps at most
//! `capacity` entries.

use std::{
    collections::{HashMap, HashSet},
    hash::Hash,
    sync::{Arc, Condvar, Mutex, MutexGuard, PoisonError},
};

struct Slot<V: ?Sized> {
    value: Arc<V>,
    last_used: u64,
}

struct Inner<K, V: ?Sized> {
    slots: HashMap<K, Slot<V>>,
    /// Keys a thread is computing now; others asking for them wait.
    pending: HashSet<K>,
    clock: u64,
}

/// A thread-safe memo holding at most `capacity` values, evicting the least recently used.
pub struct Memo<K, V: ?Sized> {
    capacity: usize,
    inner: Mutex<Inner<K, V>>,
    /// Signalled whenever a pending key finishes (or its builder panics).
    ready: Condvar,
}

impl<K, V: ?Sized> std::fmt::Debug for Memo<K, V> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Memo")
            .field("capacity", &self.capacity)
            .finish_non_exhaustive()
    }
}

impl<K: Eq + Hash + Clone, V: ?Sized> Memo<K, V> {
    /// An empty memo that keeps at most `capacity` entries (at least one).
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity: capacity.max(1),
            inner: Mutex::new(Inner {
                slots: HashMap::new(),
                pending: HashSet::new(),
                clock: 0,
            }),
            ready: Condvar::new(),
        }
    }

    /// The value for `key`, computing it with `build` on a miss.
    ///
    /// Single-flight: while one thread builds a key, others asking for the same key
    /// wait for its value instead of computing it again. `build` runs without the
    /// lock held, so different keys build in parallel. If `build` panics, a waiter
    /// takes over. A poisoned lock is recovered (every entry is a complete value).
    pub fn get_or_insert_with(&self, key: &K, build: impl FnOnce() -> Arc<V>) -> Arc<V> {
        let mut inner = self.lock();
        loop {
            inner.clock += 1;
            let now = inner.clock;
            if let Some(slot) = inner.slots.get_mut(key) {
                slot.last_used = now;
                return Arc::clone(&slot.value);
            }
            if !inner.pending.contains(key) {
                break;
            }
            inner = self
                .ready
                .wait(inner)
                .unwrap_or_else(PoisonError::into_inner);
        }
        inner.pending.insert(key.clone());
        drop(inner);

        let guard = Pending { memo: self, key };
        let value = build();
        std::mem::forget(guard);

        let mut inner = self.lock();
        inner.pending.remove(key);
        inner.clock += 1;
        let now = inner.clock;
        if inner.slots.len() >= self.capacity
            && let Some(oldest) = inner
                .slots
                .iter()
                .min_by_key(|(_, slot)| slot.last_used)
                .map(|(k, _)| k.clone())
        {
            inner.slots.remove(&oldest);
        }
        inner.slots.insert(
            key.clone(),
            Slot {
                value: Arc::clone(&value),
                last_used: now,
            },
        );
        drop(inner);
        self.ready.notify_all();
        value
    }

    fn lock(&self) -> MutexGuard<'_, Inner<K, V>> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// How many entries it holds.
    #[must_use]
    pub fn len(&self) -> usize {
        self.inner
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .slots
            .len()
    }

    /// Whether it holds nothing.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

/// Clears a pending key if its builder panics, so waiters do not hang.
struct Pending<'a, K: Eq + Hash + Clone, V: ?Sized> {
    memo: &'a Memo<K, V>,
    key: &'a K,
}

impl<K: Eq + Hash + Clone, V: ?Sized> Drop for Pending<'_, K, V> {
    fn drop(&mut self) {
        self.memo.lock().pending.remove(self.key);
        self.memo.ready.notify_all();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_at_most_capacity_and_drops_the_least_recently_used() {
        let memo: Memo<u32, u32> = Memo::new(2);
        memo.get_or_insert_with(&1, || Arc::new(10));
        memo.get_or_insert_with(&2, || Arc::new(20));
        // Touch 1, so 2 is now the least recently used.
        assert_eq!(*memo.get_or_insert_with(&1, || Arc::new(0)), 10);
        memo.get_or_insert_with(&3, || Arc::new(30));
        assert_eq!(memo.len(), 2);
        assert_eq!(*memo.get_or_insert_with(&1, || Arc::new(0)), 10, "1 kept");
        assert_eq!(
            *memo.get_or_insert_with(&2, || Arc::new(99)),
            99,
            "2 was evicted"
        );
    }

    #[test]
    fn concurrent_askers_share_one_build() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        let memo: Arc<Memo<u32, u32>> = Arc::new(Memo::new(4));
        let builds = Arc::new(AtomicUsize::new(0));
        let threads: Vec<_> = (0..8)
            .map(|_| {
                let memo = Arc::clone(&memo);
                let builds = Arc::clone(&builds);
                std::thread::spawn(move || {
                    *memo.get_or_insert_with(&7, || {
                        builds.fetch_add(1, Ordering::SeqCst);
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        Arc::new(49)
                    })
                })
            })
            .collect();
        for t in threads {
            assert_eq!(t.join().expect("thread"), 49);
        }
        assert_eq!(builds.load(Ordering::SeqCst), 1);
    }
}
