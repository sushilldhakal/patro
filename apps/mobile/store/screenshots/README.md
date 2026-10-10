# Screenshots and store images

Generated automatically (`npm run icons`):

| File | Use |
| --- | --- |
| `store/assets/icon-1024.png` | Apple only — 1024×1024. Play rejects this size. |
| `store/assets/play-icon-512.png` | **Play app icon** — 512×512, 32-bit PNG, sRGB |
| `store/assets/feature-graphic.png` | Play feature graphic 1024×500 (**required**) |
| `assets/icon.png` | App icon |
| `assets/adaptive-icon.png` | Android adaptive (66% safe zone) |
| `assets/splash-icon.png` | Splash |

## Screenshots you still need to capture

Run a production or preview build on simulator/device and capture the real UI. Do not submit Expo Go frames.

### Apple (required)

`supportsTablet` is true, so **iPhone and iPad** screenshots are both required.

1. **iPhone 6.9"** (e.g. iPhone 16 Pro Max) — 1320 × 2868. At least 3, up to 10. Portrait.
2. **iPad 13"** — 2064 × 2752. At least 3 if you keep tablet support.

Suggested shots: Home month grid, today’s panchanga, kundali, 3D sky, converter, Nepali language.

Put files in `store/screenshots/iphone/` and `store/screenshots/ipad/` (not uploaded by EAS automatically — attach in App Store Connect).

### Google Play (required)

- Phone: at least 2 screenshots, JPEG/PNG, 16:9 or 9:16, between 320px and 3840px on each side.
- Feature graphic: use `store/assets/feature-graphic.png`.
- Optional 7" / 10" tablet screenshots if you want tablet listing art.

## Capture tips

- Use light theme, Kathmandu, a festival month if possible.
- Status bar: clean (full battery, full signal) — iOS Simulator makes this easy.
- No debug banners, no Expo Go label, no `localhost` API.
