#!/usr/bin/env bash
# Publish the news feed's first page (Nepali and English) to static.vedicpatro.com, so the apps and
# the website read the home and news page from Cloudflare instead of asking this server each time.
# Run by patro-news-publish.timer every 10 minutes; uses the R2 keys in ~/patro/.env.
set -euo pipefail
ENV_FILE=/home/ubuntu/patro/.env
API=${INTERNAL_API_BASE:-http://127.0.0.1:8000/v1}
BUCKET=${R2_STATIC_BUCKET:-vedicpatro-static}

env_get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
endpoint=$(env_get R2_S3_ENDPOINT); key=$(env_get R2_ACCESS_KEY_ID); secret=$(env_get R2_SECRET_ACCESS_KEY)
[[ -n "$endpoint" && -n "$key" && -n "$secret" ]] || { logger -t patro-news-publish -p user.warning "R2 keys missing"; exit 0; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
for lang in ne en; do
  # Same request the apps make for the first page (useNewsPage: limit 30, no category, no cursor).
  curl -fsS --max-time 60 "$API/news/feed?lang=$lang&limit=30" -o "$tmp/feed-$lang.json"
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d.get("top_stories") or d.get("stories") or d.get("latest")' "$tmp/feed-$lang.json"
  curl -fsS --retry 3 --aws-sigv4 "aws:amz:auto:s3" --user "$key:$secret" \
    -H "Content-Type: application/json; charset=utf-8" -H "Cache-Control: public, max-age=300" \
    -T "$tmp/feed-$lang.json" "${endpoint%/}/$BUCKET/news/feed-$lang.json" > /dev/null
done
logger -t patro-news-publish "published news/feed-ne.json and feed-en.json"
