# Apple App Privacy (nutrition labels)

App Store Connect → App Privacy. The app does **not** track (no ATT, no IDFA).

Answer **No** to “Do you or your third-party partners use data for tracking?”

Full permission story: `permissions-review.md`.

## Data collected (linked to identity unless noted)

| Data type | Collected | Linked | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | App functionality (account) |
| Name | Yes (optional, kundali profiles) | Yes | No | App functionality |
| User ID | Yes | Yes | No | App functionality |
| Other user content | Yes (birth details, notes on profiles) | Yes | No | App functionality |
| Precise location | Yes, only if the user allows it | No* | No | App functionality (panchanga place) |
| Coarse location | Yes, only if the user allows it | No* | No | App functionality (panchanga place) |

\* Coordinates are sent to **our** API to compute panchanga for that place. They are **not** stored on the account unless the user saves a birth place on a kundali profile. Compass heading for the sky stays on the device. Do **not** mark location as used for tracking or advertising.

## Do not declare as collected

| Type | Why |
| --- | --- |
| Photos / Video | Camera is a **live preview** in Aakash Gochar only. Nothing is captured, saved or uploaded. |
| Audio | Microphone permission is off. |
| Health / Fitness / Motion | Tilt and compass stay on the device and are never stored or sent. |
| Browsing history, advertising data, purchases, diagnostics, product analytics | Not used in the app. |

## Third-party partners (sign-in only)

Google, Apple and Facebook authenticate the user. We receive an email (or Apple Hide My Email relay). They are **not** trackers.
