//! A sharded, two-generation cache: O(1) reads and writes, bounded memory.
//!
//! Each shard keeps a hot and a cold map. Reads look in hot, then cold (promoting a
//! cold hit). When hot fills, cold is dropped and hot becomes cold: everything used
//! within the last generation survives, with no per-entry bookkeeping or eviction
//! scans.

use std::{
    collections::HashMap,
    hash::{BuildHasher, Hash, RandomState},
    sync::{Mutex, PoisonError},
};

const SHARDS: usize = 16;

#[derive(Debug)]
struct Shard<K, V> {
    hot: HashMap<K, V>,
    cold: HashMap<K, V>,
}

/// A thread-safe cache holding roughly `capacity` recently used values.
#[derive(Debug)]
pub struct Cache<K, V> {
    per_shard: usize,
    hasher: RandomState,
    shards: [Mutex<Shard<K, V>>; SHARDS],
}

impl<K: Eq + Hash, V: Clone> Cache<K, V> {
    /// An empty cache keeping about `capacity` entries (between one and two
    /// generations of them).
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        Self {
            per_shard: (capacity / SHARDS).max(1),
            hasher: RandomState::new(),
            shards: std::array::from_fn(|_| {
                Mutex::new(Shard {
                    hot: HashMap::new(),
                    cold: HashMap::new(),
                })
            }),
        }
    }

    fn shard(&self, key: &K) -> &Mutex<Shard<K, V>> {
        let h = self.hasher.hash_one(key);
        #[expect(
            clippy::cast_possible_truncation,
            reason = "only the low bits pick a shard"
        )]
        &self.shards[h as usize % SHARDS]
    }

    /// The cached value for `key`, if any.
    pub fn get(&self, key: &K) -> Option<V> {
        let mut s = self
            .shard(key)
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        if let Some(v) = s.hot.get(key) {
            return Some(v.clone());
        }
        let (k, v) = s.cold.remove_entry(key)?;
        s.hot.insert(k, v.clone());
        Some(v)
    }

    /// Stores `value` for `key`.
    pub fn insert(&self, key: K, value: V) {
        let mut s = self
            .shard(&key)
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        if s.hot.len() >= self.per_shard {
            s.cold = std::mem::take(&mut s.hot);
        }
        s.hot.insert(key, value);
    }

    /// The value for `key`, computing it with `build` (outside the lock) on a miss.
    pub fn get_or_insert_with(&self, key: K, build: impl FnOnce() -> V) -> V {
        if let Some(v) = self.get(&key) {
            return v;
        }
        let v = build();
        self.insert(key, v.clone());
        v
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_back_and_stays_bounded() {
        let c: Cache<u32, u32> = Cache::new(32);
        for i in 0..1000 {
            c.insert(i, i * 2);
        }
        assert_eq!(c.get(&999), Some(1998), "the newest entry is kept");
        assert_eq!(c.get(&0), None, "the oldest entry is gone");
        let held: usize = c
            .shards
            .iter()
            .map(|s| {
                let s = s.lock().expect("lock");
                s.hot.len() + s.cold.len()
            })
            .sum();
        assert!(held <= 64, "at most two generations: {held}");
    }

    #[test]
    fn builds_once_per_key() {
        let c: Cache<u32, u32> = Cache::new(8);
        assert_eq!(c.get_or_insert_with(7, || 49), 49, "built");
        assert_eq!(c.get_or_insert_with(7, || 0), 49, "read back, not rebuilt");
    }
}
