#!/usr/bin/env bash
# Run both systems: pw.x -> lobster -> plots (and band densities for SnO2).
# Usage (from the dft-lobster folder):  NP=4 bash scripts/run_all.sh
set -euo pipefail

NP=${NP:-4}
PW=${PW:-pw.x}
PP=${PP:-pp.x}
LOBSTER=${LOBSTER:-lobster}
MPI="mpirun -np $NP"
ROOT=$(cd "$(dirname "$0")/.." && pwd)

for f in Si.pbe-n-kjpaw_psl.1.0.0.UPF Sn.pbe-dn-kjpaw_psl.1.0.0.UPF O.pbe-n-kjpaw_psl.1.0.0.UPF; do
  [ -f "$ROOT/pseudo/$f" ] || { echo "missing pseudo/$f (see README step 1)"; exit 1; }
done

run() {  # $1 = folder, $2 = title, $3 = emin, $4 = emax
  cd "$ROOT/$1"
  echo "== $1: pw.x"
  $MPI $PW -in scf.in > scf.out
  grep -q "convergence has been achieved" scf.out || { echo "$1: SCF did not converge"; exit 1; }
  echo "== $1: lobster"
  $LOBSTER > lobster.log
  grep -i "spilling" lobsterout || true
  echo "== $1: plots"
  python3 "$ROOT/scripts/plot_lobster.py" --title "$2" --emin "$3" --emax "$4"
}

run si "Si" -13 6
run sno2 "SnO2" -10 8

cd "$ROOT/sno2"
echo "== sno2: band densities at Gamma"
$MPI $PP -in pp_cbm.in > pp_cbm.out
$MPI $PP -in pp_vbm.in > pp_vbm.out
# pp.x may write Z=0 for oxygen in the cube header; set it to 8 so VESTA shows O
for c in SnO2_cbm.cube SnO2_vbm.cube; do
  python3 - "$c" <<'PY'
import sys
p = sys.argv[1]; L = open(p).read().split("\n"); nat = int(L[2].split()[0])
for i in range(6, 6 + nat):
    t = L[i].split()
    if t[0] == "0":
        L[i] = "%5d %11.6f %11.6f %11.6f %11.6f" % (8, 8.0, *map(float, t[2:5]))
open(p, "w").write("\n".join(L))
PY
done
ls -1 *.cube
echo "done"
