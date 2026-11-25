#!/bin/bash
# The Rust server on this Mac for development, with the same data files production loads.
# Vite (apps/web, `npm run dev`) and Expo (apps/mobile, `npm start`) both talk to it on port 8000.
#
#   apps/rust/scripts/dev-local.sh             all tiers: Drik kernel + Surya/Drik Chebyshev files
#   apps/rust/scripts/dev-local.sh --moshier   no Chebyshev files: the apps fall back to the built-in
#                                              series (Drik analytic, Surya formulas) for positions
#   apps/rust/scripts/dev-local.sh --no-data   no data files at all (drik routes on the server 501)
#
# Listens on 0.0.0.0 so a phone on the same Wi-Fi reaches it (Expo uses this Mac's LAN address).
# Build first if needed: cargo build -p vedic-patro -j 2   (debug; no release build)
set -euo pipefail
cd "$(dirname "$0")/.."

mode="${1:-all}"
data="$PWD/data/stage-prod"   # the wide-range files, the same ones production has
[[ -f "$data/drik/kernel.veph" ]] || data="$PWD/data/wide"

export PATRO_RS__HOST="${HOST:-0.0.0.0}"
export PATRO_RS__PORT="${PORT:-8000}"
export PATRO_RS__LOG_FILTER="${PATRO_RS__LOG_FILTER:-info}"
mkdir -p data/shared
export PATRO_RS_SHARED_DIR="$PWD/data/shared"

case "$mode" in
  all|"")
    if [[ -d "$data/drik" ]]; then
      export PATRO_RS_EPHDATA="$data/drik"
      export PATRO_RS_DRIK_CHEB="$data/drik/drik.cheb"
      export PATRO_RS_SURYA_CHEB="$data/surya/surya.cheb"
    else
      export PATRO_RS_EPHDATA="$data"
      export PATRO_RS_DRIK_CHEB="$data/drik.cheb"
      export PATRO_RS_SURYA_CHEB="$data/surya.cheb"
    fi
    ;;
  --moshier)
    export PATRO_RS_EPHDATA="$([[ -d "$data/drik" ]] && echo "$data/drik" || echo "$data")"
    echo "Moshier mode: no Surya/Drik Chebyshev files, so the apps use their built-in series."
    ;;
  --no-data)
    echo "No data files: siddhanta=drik on the server answers 501."
    ;;
  *) echo "unknown option: $mode (use --moshier or --no-data)" >&2; exit 2 ;;
esac

ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
echo "Rust API: http://127.0.0.1:${PATRO_RS__PORT}${ip:+  and http://$ip:${PATRO_RS__PORT} (phones)}"
exec ./target/debug/vedic-patro
