# Google Play Data safety

Play Console → App content → Data safety.

**Does your app collect or share any of the required user data types?** Yes  
**Is all user data collected by your app encrypted in transit?** Yes (HTTPS)  
**Do you provide a way for users to request that their data is deleted?** Yes — in-app Account → Delete account, and https://www.vedicpatro.com/privacy

## Collected (not shared with other companies for their use)

| Data type | Collected | Shared | Required | Purpose | Encrypted in transit |
| --- | --- | --- | --- | --- | --- |
| Email | Yes | No* | Optional (account) | App functionality | Yes |
| Name | Yes | No | Optional | App functionality | Yes |
| User IDs | Yes | No | Optional | App functionality | Yes |
| Other user-generated content (kundali profiles) | Yes | No | Optional | App functionality | Yes |
| Approximate location | Yes | No | Optional | App functionality | Yes |
| Precise location | Yes | No | Optional | App functionality | Yes |

\* Sign-in with Google / Facebook / Apple sends an identifier to that provider so they can authenticate; it is not “sold” or used for ads.

## Not collected

Personal info beyond the table, financial, health, messages, photos, files, calendar, contacts, app activity / analytics, web browsing, app info and performance diagnostics, device IDs for advertising.

## Security practices

- Data is encrypted in transit (TLS).
- Users can request deletion (in-app + email support@vedicpatro.com).
- Independent security review: No.

## Camera / microphone / motion

- **Camera:** live sky overlay in Aakash Gochar only. Do **not** declare photos or video as collected. Nothing is saved or uploaded.
- **Microphone:** blocked in the Android manifest. Do not declare audio.
- **Motion / compass:** on-device only for pointing the sky. Do not declare as collected.

See `permissions-review.md` for the App Review walkthrough.
