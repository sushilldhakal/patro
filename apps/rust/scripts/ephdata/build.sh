#!/bin/sh
# Build our own ephemeris files from a JPL kernel (no Swiss Ephemeris involved).
#
#   scripts/ephdata/build.sh <kernel.bsp> <out_dir> <first_year> <last_year> [step_km]
#
# Needs a JPL SPK kernel on disk: de440.bsp (1550-2650, 114 MB) or the two DE441
# parts, from https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/ .
# Writes <out_dir>/kernel.veph (bit-packed Chebyshev coefficients, default 1 m step)
# and <out_dir>/events.vidx (every anga boundary, phase, ingress and station).
# Debug-profile build, two threads: no --release, spare CPU.
set -eu
bsp=${1:?kernel.bsp}; out=${2:?out_dir}; from=${3:?first_year}; to=${4:?last_year}; step=${5:-1e-3}
cd "$(dirname "$0")/../.."
mkdir -p "$out"
cargo build -j 2 -p ephdata
./target/debug/ephdata extract "$bsp" "$out/kernel.veph" "$from" "$to" "$step"
# The index stops a year inside the kernel so light-time and ΔT never run off the data.
./target/debug/ephdata index "$out/kernel.veph" "$out/events.vidx" $((from + 1)) $((to - 1)) 2
./target/debug/ephdata check "$out/kernel.veph" "$out/events.vidx" 5000
