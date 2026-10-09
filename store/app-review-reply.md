# App Review reply — Guideline 2.1 Information Needed

Paste sections 2–6 into BOTH the Reply in App Store Connect and App Review Information → Notes.
Items marked TODO need your input before sending.

## 1. Screen recording (you must record this)
Record on a physical iPhone running the latest iOS, one take, starting from the home screen:
1. Tap the Vedic Patro icon (launch).
2. Home calendar -> tap a day -> day detail (tithi, nakshatra, festivals).
3. Switch language Nepali <-> English.
4. Allow location -> panchanga updates for your place (or search a city).
5. Account tab -> Sign up with email (or Sign in with Apple) -> verify email -> signed in.
6. Create a kundali profile (name, birth date/time/place) -> open kundali.
7. Aakash Gochar (sky view): allow camera/motion, tilt phone.
8. Account -> Delete account -> confirm -> signed out (show this last, with a throwaway account).
Do not cut between steps. The app has no in-app purchases or subscriptions, so no paid content to show.

## 2. Purpose and audience
Vedic Patro is a Nepali Bikram Sambat calendar and Vedic astrology (jyotish) reference for
Nepali-speaking users and the diaspora. It gives daily panchanga (tithi, nakshatra, yoga,
karana, sunrise/sunset), festivals and public holidays, muhurta, kundali (birth chart) and a
live sky view, in Nepali and English. It replaces printed patros and scattered websites with
one accurate, offline-capable app. Audience: general public, ages 4+/12+ per our rating.

## 3. How to access the main features
Calendar, panchanga, festivals, muhurta, sky view: no login needed; open the app.
Kundali profiles and cloud sync need an account.
Demo account: TODO create a verified account on the production API and put the email +
password here (verification email blocks reviewers otherwise).
Sign in with Apple, Google and Facebook are also offered.
Permissions: location (when in use, for place-specific times; city search is the alternative),
camera (only in the sky view as backdrop; never recorded/uploaded), motion/compass (sky view,
on-device only), Face ID (optional app unlock).

## 4. External services
- Our own backend: FastAPI + Postgres on a self-hosted server (api.vedicpatro.com / vedicpatro.com),
  behind Cloudflare. Computes panchanga/kundali with the Swiss Ephemeris (astronomical library).
- Authentication: Sign in with Apple, Google Sign-In, Facebook Login, email/password.
- Transactional email for verification and password reset: Maileroo (SMTP).
- No ads, no analytics or tracking SDKs, no payment processor, no AI services.

## 5. Regional differences
Identical in all regions. Nepali public-holiday data is Nepal-specific by nature, but all
features work the same everywhere; times are computed for the user's chosen location.

## 6. Regulated industry / third-party material
Not a regulated industry. No third-party protected content; astronomical calculations are our
own, using the Swiss Ephemeris library by Astrodienst AG under its GNU AGPL v3 license; our source code is public on GitHub (github.com/sushilldhakal).
Astrology content is informational/cultural, not medical, legal or financial advice.

## Account deletion and UGC
Account deletion: Account tab -> "Delete account" (app/account/index.tsx), calls DELETE /auth/me
and permanently removes the account and all kundali profiles.
User-generated content: none shared. Kundali profiles are private to the user; there is no
public posting, comments, or messaging, so reporting/blocking does not apply.
