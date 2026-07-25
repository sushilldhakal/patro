# Daily Kathmandu panchanga → Facebook Page

Posts today's दिन-चक्र panchanga image to a Facebook Page every morning at
**Kathmandu sunrise**. The image is fetched by Facebook from the public
`/og-image` endpoint (`full=1` → the full-height chart); the caption is a Nepali
summary plus a link to that day's `/panchanga` page.

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

## 4. Anga-change posts (optional)

Besides the once-daily sunrise post, you can also post whenever the running
**तिथि / नक्षत्र / योग / करण** changes for Kathmandu — each transition becomes its
own post (same daily image + a link to `/panchanga`). It uses the same
`FB_PAGE_ID` / `FB_PAGE_ACCESS_TOKEN`.

```bash
# Test detection without posting (needs a baseline first):
python scripts/post_panchanga_changes.py --reset      # record current angas
python scripts/post_panchanga_changes.py --dry-run    # prints only real changes

sudo cp deploy/vedicpatro-fb-changes.service /etc/systemd/system/
sudo cp deploy/vedicpatro-fb-changes.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vedicpatro-fb-changes.timer
```

The timer polls **every 5 minutes**, so a change is posted within ~5 min of when
it happens. State lives in `/var/tmp/vedicpatro-fb-anga-state.json`; the first
run records a baseline and posts nothing. A karana changes a few times a day and
the others once or twice, so expect roughly 6–10 change posts per day **around
the clock** (angas also change overnight). To restrict posting to daytime,
narrow the timer's `OnCalendar` (e.g. `*-*-* 05..21:0/5:00`).

## Notes

- **Image**: served by `/og-image?...&full=1`. If the headless browser is off
  (`OG_SCREENSHOT=false`) it falls back to the Pillow card, so a post always has
  an image.
- **Token expiry**: a Page token derived from a long-lived user token generally
  does not expire, but if a post starts failing with an OAuth error, redo step 1
  and update `FB_PAGE_ACCESS_TOKEN`.
- **Logs**: `journalctl -u vedicpatro-fb-daily.service -n 50`.
