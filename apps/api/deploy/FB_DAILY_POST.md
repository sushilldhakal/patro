# Daily Kathmandu panchanga → Facebook Page

Posts to a Facebook Page once every morning at **Kathmandu sunrise**, as a
**link post** to `/panchanga` (not an uploaded photo) — Facebook crawls that
URL itself and renders the whole card, including the chart image, as one
tappable unit that opens vedicpatro.com. A plain photo upload's image is never
clickable, which is why this uses a link post instead. The caption gives the
Nepali (BS) date alongside the Gregorian one and lists the day's anga changes
with their times:

```
आजको पञ्चाङ्ग — काठमाडौँ
शनिवार · साउन ९, २०८३ (२५ जुलाई २०२६) · सूर्योदय ०५:२२ · सूर्यास्त १८:५७

तिथि: एकादशी → द्वादशी (११:५०)
नक्षत्र: ज्येष्ठा (दिनभर)
योग: ब्रह्म → इन्द्र (२१:२४)
करण: विष्टि → बव (११:५०) → बालव (०१:०२)

पूर्ण दिन-चक्र: https://vedicpatro.com/panchanga
```

One post per day covers the whole day's transitions, so nothing needs to run
through the day. The link is bare `/panchanga` — with no stored preference and
no URL params the page already defaults to today in Kathmandu, so no query
string is needed.

> **This depends on the nginx crawler routing being live** (see
> `nginx-vedicpatro.conf`'s `map $http_user_agent $og_crawler` +
> `location = /panchanga` block). When Facebook's crawler fetches `/panchanga`
> to build the link card, nginx must route it to `/share/panchanga` for it to
> see the chart's og:image — otherwise Facebook falls back to whatever image
> it finds on the plain SPA page. If the posted card doesn't show the chart,
> that routing is the first thing to check (`curl -A facebookexternalhit
> https://vedicpatro.com/panchanga` should return the `/share/panchanga` HTML,
> not the SPA shell).

The poster is **dormant** until `FB_PAGE_ID` and `FB_PAGE_ACCESS_TOKEN` are set —
nothing posts without them.

## 1. Create a Page access token (one-time, only a Page admin can do this)

You must be an **admin of the Facebook Page**. Using your existing Meta app
(the one behind `FACEBOOK_APP_ID`):

1. Open **Graph API Explorer** → select your app.
2. **Generate User Access Token** with these permissions:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
   (For posting to your *own* Page as its admin, the app can stay in Development
   mode — full App Review is only needed for posting on behalf of other users.)
3. Exchange it for a **long-lived user token** (~60 days):
   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
       ?grant_type=fb_exchange_token
       &client_id=<FACEBOOK_APP_ID>
       &client_secret=<FACEBOOK_APP_SECRET>
       &fb_exchange_token=<short_lived_user_token>
   ```
4. Get the **Page token** (these do **not** expire when derived from a
   long-lived user token):
   ```
   GET https://graph.facebook.com/v21.0/me/accounts?access_token=<long_lived_user_token>
   ```
   Copy the target Page's `access_token` and its numeric `id`.

## 2. Configure the server

Add to `/home/ubuntu/patro/.env`:

```ini
FB_PAGE_ID=<the Page's numeric id>
FB_PAGE_ACCESS_TOKEN=<the non-expiring Page token>
# FB_GRAPH_API_VERSION=v21.0   # optional override
```

Sanity-check without posting (prints the image URL + caption):

```bash
cd /home/ubuntu/patro && . .venv/bin/activate
python scripts/post_daily_panchanga.py --dry-run
# Post once, right now, ignoring the sunrise wait + the once-a-day guard:
python scripts/post_daily_panchanga.py --force
```

## 3. Schedule it at sunrise

```bash
sudo cp deploy/vedicpatro-fb-daily.service /etc/systemd/system/
sudo cp deploy/vedicpatro-fb-daily.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vedicpatro-fb-daily.timer
systemctl list-timers vedicpatro-fb-daily.timer   # confirm next run
```

The timer fires at **23:05 UTC (≈04:50 NPT)**, just before the earliest
Kathmandu sunrise; the service then sleeps until today's exact sunrise
(recomputed daily, so it tracks the ~05:08–06:40 drift) and posts. A per-day
guard file (`/var/tmp/vedicpatro-fb-last-post.txt`) stops duplicate posts.

## Notes

- **Image**: served by `/api/og-image?...&full=1`. If the headless browser is off
  (`OG_SCREENSHOT=false`) it falls back to the Pillow card, so a post always has
  an image.
- **Token expiry**: a Page token derived from a long-lived user token generally
  does not expire, but if a post starts failing with an OAuth error, redo step 1
  and update `FB_PAGE_ACCESS_TOKEN`.
- **Logs**: `journalctl -u vedicpatro-fb-daily.service -n 50`.
