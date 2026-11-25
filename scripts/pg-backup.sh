#!/usr/bin/env bash
# Daily Postgres backup (patro-pg-backup.timer, runs as root on the production box).
# Dumps the `patro` database (accounts, profiles, events) in pg_dump's compressed custom format,
# keeps 7 days in /var/backups/patro, and copies each dump off the box to the private R2 bucket
# (backups/postgres/) with curl's SigV4 signing, using the R2_* keys the API already has.
# Restore: pg_restore --clean --if-exists -d patro patro-YYYYMMDD.dump
set -euo pipefail
DB=patro
DIR=/var/backups/patro
ENV_FILE=/home/ubuntu/patro/.env
KEEP_LOCAL=7
KEEP_REMOTE_DAYS=30

day=$(date -u +%Y%m%d)
file="$DIR/patro-$day.dump"
install -d -m 700 -o postgres -g postgres "$DIR"
runuser -u postgres -- pg_dump -Fc -Z 6 -f "$file.tmp" "$DB"
mv -f "$file.tmp" "$file"
chmod 600 "$file"
# A dump that pg_restore cannot list is not a backup.
runuser -u postgres -- pg_restore --list "$file" > /dev/null
logger -t patro-pg-backup "dumped $DB to $file ($(du -h "$file" | cut -f1))"
ls -1t "$DIR"/patro-*.dump | tail -n +$((KEEP_LOCAL + 1)) | xargs -r rm -f

env_get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
endpoint=$(env_get R2_S3_ENDPOINT); bucket=$(env_get R2_BUCKET)
key=$(env_get R2_ACCESS_KEY_ID); secret=$(env_get R2_SECRET_ACCESS_KEY)
if [[ -z "$endpoint" || -z "$bucket" || -z "$key" || -z "$secret" ]]; then
  logger -t patro-pg-backup -p user.warning "R2 keys missing in $ENV_FILE: dump kept on this box only"
  exit 0
fi
s3() { curl -fsS --retry 3 --aws-sigv4 "aws:amz:auto:s3" --user "$key:$secret" "$@"; }
s3 -T "$file" "${endpoint%/}/$bucket/backups/postgres/patro-$day.dump" > /dev/null
old=$(date -u -d "$KEEP_REMOTE_DAYS days ago" +%Y%m%d)
s3 -X DELETE "${endpoint%/}/$bucket/backups/postgres/patro-$old.dump" > /dev/null || true
logger -t patro-pg-backup "copied patro-$day.dump to R2 backups/postgres/"
