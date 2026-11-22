#!/bin/sh
# Compare our files with the original JPL kernel through independent code
# (jplephem + SOFA via pyerfa), in a throwaway virtualenv:
#   10,000 random instants: Chebyshev evaluation against jplephem
#    3,000 random instants: frames, light-time, aberration, ayanamsha against SOFA
#   ~20,000 random events:  boundary times re-solved from the original kernel
#
#   scripts/ephdata/verify.sh <kernel.bsp> <out_dir>   (the folder build.sh wrote)
set -eu
bsp=${1:?kernel.bsp}; out=${2:?out_dir}
here=$(cd "$(dirname "$0")" && pwd); cd "$here/../.."
venv=${EPHDATA_VENV:-"$out/venv"}
[ -d "$venv" ] || { python3 -m venv "$venv" && "$venv/bin/pip" install -q jplephem numpy pyerfa; }
exe=./target/debug/ephdata
"$venv/bin/python" "$here/verify_kernel.py" "$bsp" "$out/kernel.veph" $exe
"$venv/bin/python" "$here/verify_sky.py" "$bsp" "$out/kernel.veph" $exe
$exe sample "$out/events.vidx" 12000 3 > "$out/samples.txt"
"$venv/bin/python" "$here/verify_events.py" "$bsp" "$out/samples.txt"
