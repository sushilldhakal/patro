# Location, camera, and motion — review + legal

This is the single story for App Store Review, Play review, and the privacy policy. Every permission string, nutrition label, and in-app screen must match it.

## What the app actually does

| Sensor | When it is asked | What happens to the data | Can the user refuse? |
| --- | --- | --- | --- |
| **Location (when in use only)** | (1) User taps “Use my location” to set the panchanga city. (2) User turns on phone-pointing in **Aakash Gochar** (iOS needs location for true-north compass). | Lat/lon are sent to *our* API over HTTPS **only** to compute panchanga / sunrise / muhurta for that place. Not written to the account unless the user saves a birth place on a kundali profile. Compass heading is processed **on the device**. Never used in the background. Never sold. Never used for ads. | Yes. Search a city by name. Sky can be dragged by hand. |
| **Camera (back camera)** | User taps the compass again in Aakash Gochar after pointing is already on — live overlay only. | Preview is drawn on screen. **No photo, no video, no upload, no save.** Microphone is disabled. | Yes. Sky map and gyro pointing still work. |
| **Motion (accelerometer / gyro / compass)** | Same Aakash Gochar pointing mode. | Stays **on this device**. Not stored. Not sent to our servers. | Yes. Drag the sky by hand. |

The app does **not** request background location, photo library, microphone, or tracking (IDFA / ATT).

## App Store permission strings (already in the binary)

These appear on the system dialog. Apple 5.1.2 rejects vague “to improve the experience” copy. Ours name the feature, say it is optional, and say what we do **not** do.

**Location:** panchanga + true-north sky compass, while the app is open, city search as alternative, no background, no ads.

**Camera:** Aakash Gochar live overlay only; no photos, recording, or upload; sky map works without it.

**Motion:** Aakash Gochar so the sky turns with the phone; on-device only; drag as alternative.

## App Privacy / Data safety (do not over-declare)

Declare as **collected**:

- Precise + coarse **location** — App Functionality, not tracking, not linked to identity unless the user saved a birth place.

Do **not** declare as collected:

- Photos / video / camera roll (preview is not stored)
- Audio
- Motion / fitness / health
- Tracking / advertising identifiers

Answer **No** to tracking.

## Paste this into App Review notes

```
PERMISSIONS (optional — the app works if denied)

Location — When In Use only, never background, never ads.
Two features only:
1) Panchanga: tap the location chip → “Use my location” (or search a city).
2) 3D sky: open Aakash Gochar from the menu → tap the compass so the sky follows the phone (iOS uses location for true north).

Camera — Aakash Gochar only. After pointing is on, tap the compass centre to show the live sky behind the map. We do not take photos, record, or upload. Deny camera: pointing still works without the overlay.

Motion — same screen; phone tilt/turn aims the sky. On-device only. Deny: drag the sky by hand.

Privacy policy: https://www.vedicpatro.com/privacy
Account deletion: Account → Delete account
Jyotish/muhurta is educational, not medical or financial advice.
```

## If Apple asks “why location for a calendar?”

Reply with this, unchanged:

Location is not used to track the user. Vedic panchanga (sunrise, tithi, muhurta) is computed for a geographic place. The user may type a city. “Use my location” is a shortcut. Separately, the optional 3D sky view needs a compass heading relative to true north; on iOS that API requires When In Use location. Heading is not sent to our servers. Background location is not enabled.

## If Apple asks “why camera?”

The camera is a live viewfinder behind the sky map (augmented overlay) in Aakash Gochar. We do not capture, store, or upload images. The same screen works without the camera.

## Legal position (privacy policy)

Consent is the system permission dialog plus the user’s choice to tap those controls. Coordinates used for panchanga are processed as a service request to Vedic Patro, not shared with advertisers or data brokers. Sensor streams that never leave the device are not “sold” or “shared.” Users can withdraw by denying the permission in iOS Settings or by using city search / manual sky.
