#!/bin/sh
# Compare our files with the original JPL kernel through independent code
# (jplephem + SOFA via pyerfa), in a throwaway virtualenv:
#   10,000 random instants: Chebyshev evaluation against jplephem
#    3,000 random instants: frames, light-time, aberration, ayanamsha against SOFA
#
#   scripts/ephdata/verify.sh <out_dir> <kernel.bsp>...   (the folder build.sh wrote)
set -eu
out=${1:?out_dir}; shift; bsps="$*"  # the same kernel(s) the files were built from
here=$(cd "$(dirname "$0")" && pwd); cd "$here/../.."
venv=${EPHDATA_VENV:-"$out/venv"}
[ -d "$venv" ] || { python3 -m venv "$venv" && "$venv/bin/pip" install -q jplephem numpy pyerfa; }
exe=./target/debug/ephdata
"$venv/bin/python" "$here/verify_kernel.py" "$out/kernel.veph" $exe $bsps
"$venv/bin/python" "$here/verify_sky.py" "$out/kernel.veph" $exe $bsps
