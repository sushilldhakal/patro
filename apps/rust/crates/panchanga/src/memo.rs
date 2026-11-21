//! A bounded, process-wide memo: least-recently-used entries are dropped once it is full.
//!
//! The server memoizes results that never change for their key (a year's festivals
//! at a location, a lunar year). Keyed by location, an unbounded map grows with every
//! new set of coordinates for the life of the process; this one keeps at most
//! `capacity` entries.

use std::{
    collections::HashMap,
    hash::Hash,
    sync::{Arc, Mutex, PoisonError},
};

struct Slot<V: ?Sized> {
    value: Arc<V>,
    last_used: u64,
}

struct Inner<K, V: ?Sized> {
    slots: HashMap<K, Slot<V>>,
    clock: u64,
}

/// A thread-safe memo holding at most `capacity` values, evicting the least recently used.
pub struct Memo<K, V: ?Sized> {
    capacity: usize,
    inner: Mutex<Inner<K, V>>,
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
                clock: 0,
            }),
        }
    }

    /// The value for `key`, computing it with `build` on a miss.
    ///
    /// `build` runs without the lock held, so two threads may compute the same key at
    /// once; the first to finish is kept and both get it. A poisoned lock is recovered
    /// (every entry is a complete value, so nothing half-written can be read).
    pub fn get_or_insert_with(&self, key: &K, build: impl FnOnce() -> Arc<V>) -> Arc<V> {
        if let Some(hit) = self.touch(key) {
            return hit;
        }
        let value = build();
        let mut inner = self.inner.lock().unwrap_or_else(PoisonError::into_inner);
        inner.clock += 1;
        let now = inner.clock;
        if let Some(slot) = inner.slots.get_mut(key) {
            slot.last_used = now;
            return Arc::clone(&slot.value);
        }
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
        value
    }

    fn touch(&self, key: &K) -> Option<Arc<V>> {
        let mut inner = self.inner.lock().unwrap_or_else(PoisonError::into_inner);
        inner.clock += 1;
        let now = inner.clock;
        inner.slots.get_mut(key).map(|slot| {
            slot.last_used = now;
            Arc::clone(&slot.value)
        })
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
}
