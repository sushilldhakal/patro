//! A sharded, two-generation cache: O(1) reads and writes, bounded memory.
//!
//! Each shard keeps a hot and a cold map. Reads look in hot, then cold (promoting a
//! cold hit). When hot fills, cold is dropped and hot becomes cold: everything used
//! within the last generation survives, with no per-entry bookkeeping or eviction
//! scans.

use std::{
    collections::HashMap,
    hash::{BuildHasher, BuildHasherDefault, Hash, Hasher},
    sync::{Mutex, PoisonError},
};

const SHARDS: usize = 16;

/// A multiply-rotate hasher (the `FxHash` scheme) for the cache's small fixed-size
/// keys. The keys are internal numbers, never request text, so `SipHash`'s
/// collision resistance would only cost time on this hot path.
#[derive(Debug, Default, Clone, Copy)]
struct FastHasher(u64);

const SEED: u64 = 0x51_7c_c1_b7_27_22_0a_95;

impl FastHasher {
    fn add(&mut self, word: u64) {
        self.0 = (self.0.rotate_left(5) ^ word).wrapping_mul(SEED);
    }
}

impl Hasher for FastHasher {
    fn write(&mut self, bytes: &[u8]) {
        for chunk in bytes.chunks(8) {
            let mut word = [0u8; 8];
            word[..chunk.len()].copy_from_slice(chunk);
            self.add(u64::from_le_bytes(word));
        }
    }

    fn write_u8(&mut self, i: u8) {
        self.add(u64::from(i));
    }

    fn write_u32(&mut self, i: u32) {
        self.add(u64::from(i));
    }

    fn write_u64(&mut self, i: u64) {
        self.add(i);
    }

    fn write_i64(&mut self, i: i64) {
        self.add(u64::from_ne_bytes(i.to_ne_bytes()));
    }

    fn write_usize(&mut self, i: usize) {
        self.add(i as u64);
    }

    fn finish(&self) -> u64 {
        // The multiply leaves the entropy in the high bits; one more round folds it
        // down so the low bits (shard and bucket choice) are mixed too.
        let m = self.0.wrapping_mul(0x9e37_79b9_7f4a_7c15);
        m ^ (m >> 32)
    }
}

type Fast = BuildHasherDefault<FastHasher>;

#[derive(Debug)]
struct Shard<K, V> {
    hot: HashMap<K, V, Fast>,
    cold: HashMap<K, V, Fast>,
}

/// A thread-safe cache holding roughly `capacity` recently used values.
#[derive(Debug)]
pub struct Cache<K, V> {
    per_shard: usize,
    hasher: Fast,
    shards: [Mutex<Shard<K, V>>; SHARDS],
}

impl<K: Eq + Hash, V: Clone> Cache<K, V> {
    /// An empty cache keeping about `capacity` entries (between one and two
    /// generations of them).
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        Self {
            per_shard: (capacity / SHARDS).max(1),
            hasher: Fast::default(),
            shards: std::array::from_fn(|_| {
                Mutex::new(Shard {
                    hot: HashMap::default(),
                    cold: HashMap::default(),
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
    fn nearby_keys_spread_over_every_shard() {
        let c: Cache<i64, u8> = Cache::new(64);
        let mut hit = [false; SHARDS];
        for k in 0..256_i64 {
            let shard = std::ptr::from_ref(c.shard(&k));
            let at = c.shards.iter().position(|s| std::ptr::eq(s, shard));
            hit[at.expect("a shard of this cache")] = true;
        }
        assert!(hit.iter().all(|h| *h), "every shard is used: {hit:?}");
    }

    #[test]
    fn builds_once_per_key() {
        let c: Cache<u32, u32> = Cache::new(8);
        assert_eq!(c.get_or_insert_with(7, || 49), 49, "built");
        assert_eq!(c.get_or_insert_with(7, || 0), 49, "read back, not rebuilt");
    }
}
