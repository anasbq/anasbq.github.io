#!/usr/bin/env bash
# Run both systems: pw.x -> lobster -> plots (and band densities for SnO2).
# Usage (from the dft-lobster folder):
#   NP=4 bash scripts/run_all.sh                 # PBE, runs in si/ and sno2/
#   FUNC=pbe0 NP=64 bash scripts/run_all.sh      # PBE0, runs in si-pbe0/ and sno2-pbe0/
# On a cluster you can set MPI (e.g. MPI="srun") and PWFLAGS (e.g. PWFLAGS="-nk 8").
set -euo pipefail

NP=${NP:-4}
FUNC=${FUNC:-pbe}
PW=${PW:-pw.x}
PP=${PP:-pp.x}
PROJWFC=${PROJWFC:-projwfc.x}
LOBSTER=${LOBSTER:-lobster}
MPI=${MPI:-"mpirun -np $NP"}
PWFLAGS=${PWFLAGS:-}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

# PBE0 runs in its own copy of each folder, so the PBE results stay untouched
prepare() {  # $1 = system folder; prints the folder to run in
  if [ "$FUNC" = pbe ]; then echo "$1"; return; fi
  mkdir -p "$ROOT/$1-$FUNC"
  for f in lobsterin projwfc.in pp_cbm.in pp_vbm.in; do
    [ -f "$ROOT/$1/$f" ] && cp "$ROOT/$1/$f" "$ROOT/$1-$FUNC/"
  done
  cp "$ROOT/$1/scf_$FUNC.in" "$ROOT/$1-$FUNC/scf.in"
  echo "$1-$FUNC"
}

for f in Si.pbe-n-kjpaw_psl.1.0.0.UPF Sn.pbe-dn-kjpaw_psl.1.0.0.UPF O.pbe-n-kjpaw_psl.1.0.0.UPF; do
  [ -f "$ROOT/pseudo/$f" ] || { echo "missing pseudo/$f (see README step 1)"; exit 1; }
done

run() {  # $1 = folder, $2 = title (= prefix), $3 = emin, $4 = emax, $5 = qe_pcohp.py options
  cd "$ROOT/$1"
  echo "== $1: pw.x"
  $MPI $PW $PWFLAGS -in scf.in > scf.out
  grep -q "convergence has been achieved" scf.out || { echo "$1: SCF did not converge"; exit 1; }
  echo "== $1: lobster"
  $LOBSTER > lobster.log
  grep -i "spilling" lobsterout || true
  echo "== $1: plots"
  python3 "$ROOT/scripts/plot_lobster.py" --title "$2" --emin "$3" --emax "$4"
  echo "== $1: projwfc.x + our own projected COHP (to compare with LOBSTER)"
  $MPI $PROJWFC -in projwfc.in > projwfc.out
  rm -f pcohp_summary.txt
  python3 "$ROOT/scripts/qe_pcohp.py" --prefix "$2" $5
}

SI=$(prepare si)
SNO2=$(prepare sno2)
run "$SI" "Si" -13 6 "--pair Si Si --rmax 2.5"
run "$SNO2" "SnO2" -10 8 "--pair Sn O --rmin 1.8 --rmax 2.2 --emin -22 --emax 12"

cd "$ROOT/$SNO2"
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
