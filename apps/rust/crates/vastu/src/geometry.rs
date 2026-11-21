//! Pure rectangle geometry (`engine/vastu/geometry.py`).

/// An axis-aligned rectangle, metres; x grows east, y grows south.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Rect {
    pub(crate) x: f64,
    pub(crate) y: f64,
    pub(crate) w: f64,
    pub(crate) h: f64,
}

impl Rect {
    pub(crate) const fn new(x: f64, y: f64, w: f64, h: f64) -> Self {
        Self { x, y, w, h }
    }

    pub(crate) fn area(&self) -> f64 {
        self.w * self.h
    }
}

/// A wall segment of a rectangle, labelled `n`/`e`/`s`/`w`.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Seg {
    pub(crate) wall: char,
    pub(crate) x1: f64,
    pub(crate) y1: f64,
    pub(crate) x2: f64,
    pub(crate) y2: f64,
}

impl Seg {
    pub(crate) const fn new(wall: char, x1: f64, y1: f64, x2: f64, y2: f64) -> Self {
        Self {
            wall,
            x1,
            y1,
            x2,
            y2,
        }
    }

    pub(crate) fn length(&self) -> f64 {
        ((self.x2 - self.x1).powi(2) + (self.y2 - self.y1).powi(2)).sqrt()
    }
}

/// `split_by(outer, cut, min_side)`: what is left of `outer` once `cut` is carved out.
pub(crate) fn split_by(outer: Rect, cut: Rect, min_side: f64) -> Vec<Rect> {
    let ix = outer.x.max(cut.x);
    let iy = outer.y.max(cut.y);
    let ir = (outer.x + outer.w).min(cut.x + cut.w);
    let ib = (outer.y + outer.h).min(cut.y + cut.h);
    if ir <= ix + 0.02 || ib <= iy + 0.02 {
        return vec![outer];
    }
    let mut out = Vec::with_capacity(4);
    if ix - outer.x >= min_side {
        out.push(Rect::new(outer.x, outer.y, ix - outer.x, outer.h));
    }
    if outer.x + outer.w - ir >= min_side {
        out.push(Rect::new(ir, outer.y, outer.x + outer.w - ir, outer.h));
    }
    if iy - outer.y >= min_side {
        out.push(Rect::new(ix, outer.y, ir - ix, iy - outer.y));
    }
    if outer.y + outer.h - ib >= min_side {
        out.push(Rect::new(ix, ib, ir - ix, outer.y + outer.h - ib));
    }
    out.retain(|r| r.w >= min_side && r.h >= min_side);
    out
}

/// `overlap_area(a, b)`.
pub(crate) fn overlap_area(a: Rect, b: Rect) -> f64 {
    let w = (a.x + a.w).min(b.x + b.w) - a.x.max(b.x);
    let h = (a.y + a.h).min(b.y + b.h) - a.y.max(b.y);
    if w > 0.0 && h > 0.0 { w * h } else { 0.0 }
}

/// `shared_seg(a, b)`: where `a` and `b` touch flush along more than 0.45 m.
pub(crate) fn shared_seg(a: Rect, b: Rect) -> Option<Seg> {
    let eps = 0.04;
    if (a.x + a.w - b.x).abs() < eps {
        let (lo, hi) = (a.y.max(b.y), (a.y + a.h).min(b.y + b.h));
        if hi - lo > 0.45 {
            return Some(Seg::new('e', b.x, lo, b.x, hi));
        }
    }
    if (b.x + b.w - a.x).abs() < eps {
        let (lo, hi) = (a.y.max(b.y), (a.y + a.h).min(b.y + b.h));
        if hi - lo > 0.45 {
            return Some(Seg::new('w', a.x, lo, a.x, hi));
        }
    }
    if (a.y + a.h - b.y).abs() < eps {
        let (lo, hi) = (a.x.max(b.x), (a.x + a.w).min(b.x + b.w));
        if hi - lo > 0.45 {
            return Some(Seg::new('s', lo, b.y, hi, b.y));
        }
    }
    if (b.y + b.h - a.y).abs() < eps {
        let (lo, hi) = (a.x.max(b.x), (a.x + a.w).min(b.x + b.w));
        if hi - lo > 0.45 {
            return Some(Seg::new('n', lo, a.y, hi, a.y));
        }
    }
    None
}

/// `touches(a, b)`: the boundaries meet at all, a corner point included.
pub(crate) fn touches(a: Rect, b: Rect) -> bool {
    let eps = 0.05;
    a.x <= b.x + b.w + eps
        && b.x <= a.x + a.w + eps
        && a.y <= b.y + b.h + eps
        && b.y <= a.y + a.h + eps
}

/// `edges(rect)`: north, east, south, west.
pub(crate) fn edges(r: Rect) -> [Seg; 4] {
    [
        Seg::new('n', r.x, r.y, r.x + r.w, r.y),
        Seg::new('e', r.x + r.w, r.y, r.x + r.w, r.y + r.h),
        Seg::new('s', r.x, r.y + r.h, r.x + r.w, r.y + r.h),
        Seg::new('w', r.x, r.y, r.x, r.y + r.h),
    ]
}

/// `on_perimeter(seg, width, height)`.
pub(crate) fn on_perimeter(seg: &Seg, width: f64, height: f64) -> bool {
    let eps = 0.06;
    if (seg.x1 - seg.x2).abs() < eps {
        seg.x1.abs() < eps || (seg.x1 - width).abs() < eps
    } else {
        seg.y1.abs() < eps || (seg.y1 - height).abs() < eps
    }
}

fn overlap1(a0: f64, a1: f64, b0: f64, b1: f64) -> f64 {
    0.0_f64.max(a1.min(b1) - a0.max(b0))
}

/// `segs_overlap(a, b)`: shared length of two collinear segments.
pub(crate) fn segs_overlap(a: &Seg, b: &Seg) -> f64 {
    let eps = 0.06;
    if (a.x1 - a.x2).abs() < eps && (b.x1 - b.x2).abs() < eps && (a.x1 - b.x1).abs() < eps {
        return overlap1(
            a.y1.min(a.y2),
            a.y1.max(a.y2),
            b.y1.min(b.y2),
            b.y1.max(b.y2),
        );
    }
    if (a.y1 - a.y2).abs() < eps && (b.y1 - b.y2).abs() < eps && (a.y1 - b.y1).abs() < eps {
        return overlap1(
            a.x1.min(a.x2),
            a.x1.max(a.x2),
            b.x1.min(b.x2),
            b.x1.max(b.x2),
        );
    }
    0.0
}

/// Python's `max(items, key=…)`: the first of equal maxima.
pub(crate) fn max_by_first<T, K: PartialOrd>(
    items: impl IntoIterator<Item = T>,
    key: impl Fn(&T) -> K,
) -> Option<T> {
    let mut best: Option<(T, K)> = None;
    for item in items {
        let k = key(&item);
        if best.as_ref().is_none_or(|(_, bk)| k > *bk) {
            best = Some((item, k));
        }
    }
    best.map(|(t, _)| t)
}

/// Python's `min(items, key=…)`: the first of equal minima.
pub(crate) fn min_by_first<T, K: PartialOrd>(
    items: impl IntoIterator<Item = T>,
    key: impl Fn(&T) -> K,
) -> Option<T> {
    let mut best: Option<(T, K)> = None;
    for item in items {
        let k = key(&item);
        if best.as_ref().is_none_or(|(_, bk)| k < *bk) {
            best = Some((item, k));
        }
    }
    best.map(|(t, _)| t)
}

/// Python's stable `sort(key=…)` on a float key (no NaNs reach it).
pub(crate) fn sort_by_key_f64<T>(items: &mut [T], key: impl Fn(&T) -> f64) {
    items.sort_by(|a, b| {
        key(a)
            .partial_cmp(&key(b))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
}
