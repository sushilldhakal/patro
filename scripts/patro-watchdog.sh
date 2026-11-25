#!/usr/bin/env bash
# Every minute (patro-watchdog.timer): asks the Rust API for /health and one real route through nginx.
# Three failures in a row restart patro-rust; everything is written to the journal (tag patro-watchdog),
# where `journalctl -t patro-watchdog -p warning` lists the trouble.
set -u
STATE=/var/tmp/patro-watchdog.fails
SERVICE=patro-rust
ok=1
curl -fsS -m 5 -o /dev/null http://127.0.0.1:8100/health || ok=0
code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'Host: www.vedicpatro.com' --resolve www.vedicpatro.com:443:127.0.0.1 -k "https://www.vedicpatro.com/api/v1/panchanga/elements") || code=000
[[ "${code}" == "200" ]] || ok=0
free_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
disk=$(df --output=pcent / | tail -1 | tr -dc 0-9)
(( free_mb < 600 )) && logger -t patro-watchdog -p user.warning "low memory: ${free_mb} MB available"
(( disk > 90 )) && logger -t patro-watchdog -p user.warning "disk ${disk}% full"
if (( ok )); then
  rm -f "${STATE}"
  exit 0
fi
fails=$(( $(cat "${STATE}" 2>/dev/null || echo 0) + 1 ))
echo "${fails}" > "${STATE}"
logger -t patro-watchdog -p user.warning "check failed (${fails}): /health or the public route answered ${code}"
if (( fails >= 3 )); then
  logger -t patro-watchdog -p user.err "restarting ${SERVICE} after ${fails} failed checks"
  systemctl restart "${SERVICE}"
  rm -f "${STATE}"
fi
