#!/bin/bash
# The Rust server on localhost for development, with its own Surya and Drik data.
#   apps/rust/scripts/dev-local.sh            (port 8092, or $PORT)
# Build first: cargo build -p vedic-patro -j 2   (debug; no release build needed)
cd "$(dirname "$0")/.." || exit 1
export PATRO_RS__HOST=127.0.0.1
export PATRO_RS__PORT="${PORT:-8092}"
export PATRO_RS__LOG_FILTER="${PATRO_RS__LOG_FILTER:-info}"
export PATRO_RS_EPHDATA="$PWD/data/ephdata"
export PATRO_RS_SURYA_CHEB="$PWD/data/surya/surya.cheb"
export PATRO_RS_DRIK_CHEB="$PWD/data/drik/drik.cheb"
exec ./target/debug/vedic-patro
