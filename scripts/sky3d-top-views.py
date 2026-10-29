"""
The planet pictures the panchanga wheel draws (apps/mobile/assets/sky3d/top and
apps/web/public/sky3d/top): each planet seen straight down on its north pole,
made from an equirectangular map.

Maps: Solar System Scope 2K textures (https://www.solarsystemscope.com/textures/,
CC BY 4.0) — 2k_sun, 2k_moon, 2k_mercury, 2k_venus_surface, 2k_mars,
2k_jupiter, 2k_saturn. A 2048-wide map holds about 650 px of detail round a
polar view's rim, so the pictures are 640 px.

    python3 scripts/sky3d-top-views.py <folder of 2k maps> <out folder>
"""
import sys

import numpy as np
from PIL import Image

MAPS = {
    "sun": "2k_sun.jpg",
    "moon": "2k_moon.jpg",
    "mercury": "2k_mercury.jpg",
    "venus": "2k_venus_surface.jpg",
    "mars": "2k_mars.jpg",
    "jupiter": "2k_jupiter.jpg",
    "saturn": "2k_saturn.jpg",
}
SIZE = 640
SUPERSAMPLE = 2


def north_pole_view(path: str, size: int) -> Image.Image:
    """Orthographic, north pole at the centre, mirrored and turned 270° to match the wheel."""
    m = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    h, w, _ = m.shape
    c = (size - 1) / 2
    y, x = np.mgrid[0:size, 0:size]
    u = -(x - c) / (size / 2)
    v = (y - c) / (size / 2)
    r = np.sqrt(u * u + v * v)
    lat = np.arccos(np.clip(r, 0, 1))
    lon = (np.arctan2(v, u) + np.radians(270)) % (2 * np.pi)
    fx = lon / (2 * np.pi) * w
    fy = (np.pi / 2 - lat) / np.pi * h
    x0 = np.floor(fx).astype(int)
    y0 = np.clip(np.floor(fy).astype(int), 0, h - 1)
    x1 = (x0 + 1) % w
    y1 = np.clip(y0 + 1, 0, h - 1)
    x0 %= w
    ax = (fx - np.floor(fx))[..., None]
    ay = (fy - np.floor(fy))[..., None]
    px = (m[y0, x0] * (1 - ax) + m[y0, x1] * ax) * (1 - ay) + (m[y1, x0] * (1 - ax) + m[y1, x1] * ax) * ay
    alpha = np.clip((1 - r) * size / 2 + 0.5, 0, 1) * 255
    return Image.fromarray(np.dstack([np.clip(px, 0, 255), alpha]).astype(np.uint8))


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    for name, file in MAPS.items():
        img = north_pole_view(f"{src}/{file}", SIZE * SUPERSAMPLE)
        img.resize((SIZE, SIZE), Image.LANCZOS).save(f"{out}/{name}.png", optimize=True)


if __name__ == "__main__":
    main()
