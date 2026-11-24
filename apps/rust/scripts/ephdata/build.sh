#!/bin/sh
# Build our own ephemeris files from a JPL kernel (no Swiss Ephemeris involved).
#
#   scripts/ephdata/build.sh <out_dir> <first_year> <last_year> <step_km> <kernel.bsp>...
#
# Needs JPL SPK kernels on disk: de440.bsp (1550-2650, 114 MB) or the two DE441
# parts (give both: they join at 1969), from https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/ .
# Writes <out_dir>/kernel.veph (bit-packed Chebyshev coefficients, default 1 m step): planet
# positions only. Every boundary (tithi, nakshatra, ...) is worked out from them by the client.
# Debug-profile build, two threads: no --release, spare CPU.
set -eu
out=${1:?out_dir}; from=${2:?first_year}; to=${3:?last_year}; step=${4:?step_km}; shift 4
cd "$(dirname "$0")/../.."
mkdir -p "$out"
cargo build -j 2 -p ephdata
./target/debug/ephdata extract "$out/kernel.veph" "$from" "$to" "$step" "$@"
