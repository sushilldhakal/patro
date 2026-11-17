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
| Other user content | Yes (birth details and notes on kundali profiles; events, tasks and appointments with title, notes, place and invitee emails; events imported from the phone's calendars) — only when signed in | Yes | No | App functionality |
| Device ID | Yes (push notification token, with time zone and locale) — only when signed in | Yes | No | App functionality (reminders) |
| Crash data | Yes (Sentry, `sendDefaultPii: false`, no user set) | No | No | App functionality |
| Performance data | Yes (Sentry traces at 20%, EAS Observe launch and screen timings; personal route params filtered) | No | No | App functionality |
| Product interaction | Yes (Meta SDK App Events: install and app opens, from 1.2.3) | No | No | Third-party advertising (measuring Meta app-install ads) and Analytics |
| Other diagnostic data | Yes (Meta SDK sends device model, OS version, app version with each event) | No | No | Third-party advertising and Analytics |
| Precise location | Yes, only if the user allows it | No* | No | App functionality (panchanga place) |
| Coarse location | Yes, only if the user allows it | No* | No | App functionality (panchanga place) |

\* Coordinates are sent to **our** API to compute panchanga for that place. They are **not** stored on the account unless the user saves a birth place on a kundali profile. Compass heading for the sky stays on the device. Do **not** mark location as used for tracking or advertising.

Signed out, events (including imported phone-calendar events) stay on the device and are not collected. Signing in uploads them to the account once.

## Do not declare as collected

| Type | Why |
| --- | --- |
| Photos / Video | Camera is a **live preview** in Aakash Gochar only. Nothing is captured, saved or uploaded. |
| Audio | Microphone permission is off. |
| Health / Fitness / Motion | Tilt and compass stay on the device and are never stored or sent. |
| Browsing history, advertising data, purchases | Not used in the app. No in-app purchases, so Meta needs no App Store shared secret. |
| Contacts | The app never reads the address book. Invitee emails are typed by the user and are declared under Other user content. |

## Third-party partners

Google, Apple and Facebook authenticate the user. We receive an email (or Apple Hide My Email relay). They are **not** trackers.

Meta SDK (App Events, `plugins/with-meta-app-events.js`, from 1.2.3) reports installs and app opens to Meta so app-install ads can be measured. The advertising ID is never collected (no ATT prompt, `FacebookAdvertiserIDCollectionEnabled` false), Meta measures iOS through SKAdNetwork / AEM, and events carry no account id. So it is declared as Product interaction + Other diagnostic data, **not linked**, **not tracking**.
