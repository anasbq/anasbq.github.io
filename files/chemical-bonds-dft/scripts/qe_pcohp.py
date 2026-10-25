#!/usr/bin/env python3
"""Projected COHP straight from Quantum ESPRESSO (no LOBSTER needed).

This follows the same idea LOBSTER uses: project the plane-wave states onto
local atomic orbitals, rebuild a tight-binding-like Hamiltonian in that local
basis, then split the band energy into bonding / antibonding contributions
for each atom pair. Here the local basis is the (Lowdin-orthogonalised) atomic
pseudo-wavefunctions that projwfc.x uses, not LOBSTER's fitted basis, so the
numbers will differ from LOBSTER's while the bonding picture should agree.

Steps (inside the folder where pw.x ran with nosym/noinv):
    projwfc.x -in projwfc.in > projwfc.out      # writes <prefix>.save/atomic_proj.xml
    python3 ../scripts/qe_pcohp.py --prefix Si --pair Si Si --rmax 2.5 --title Si

Writes: pcohp_<A>-<B>.dat (E, -pCOHP total and per orbital pair, -IpCOHP)
        pcohp_summary.txt
Energies are relative to the valence band maximum (E = 0).
"""
import argparse
import re
import xml.etree.ElementTree as ET
from collections import defaultdict

import numpy as np

RY = 13.605693122994
BOHR = 0.529177210903
NLABEL = {("Si", 0): "3s", ("Si", 1): "3p", ("Sn", 0): "5s", ("Sn", 1): "5p", ("Sn", 2): "4d",
          ("O", 0): "2s", ("O", 1): "2p", ("Ti", 0): "4s", ("Ti", 1): "3p", ("Ti", 2): "3d"}


def read_structure(prefix):
    root = ET.parse(f"{prefix}.save/data-file-schema.xml").getroot()
    st = root.find("output/atomic_structure")
    alat = float(st.get("alat"))
    atoms = [(a.get("name"), np.array(a.text.split(), float)) for a in st.find("atomic_positions")]
    cell = np.array([[float(x) for x in st.find(f"cell/a{i}").text.split()] for i in (1, 2, 3)])
    return alat, atoms, cell


def read_states(projwfc_out):
    states = []
    pat = re.compile(r"state #\s*(\d+): atom\s+(\d+) \((\w+)\s*\).*?\(l=(\d) m=\s*(\d)\)")
    for line in open(projwfc_out):
        m = pat.search(line)
        if m:
            states.append((int(m[2]) - 1, m[3], int(m[4])))
    return states


def read_proj(prefix):
    root = ET.parse(f"{prefix}.save/atomic_proj.xml").getroot()
    head = root.find("HEADER")
    nb = int(head.get("NUMBER_OF_BANDS"))
    nwfc = int(head.get("NUMBER_OF_ATOMIC_WFC"))
    ks, ws, es, cs = [], [], [], []
    for kp, e, pr in zip(root.iter("K-POINT"), root.iter("E"), root.iter("PROJS")):
        ks.append(np.array(kp.text.split(), float))
        ws.append(float(kp.get("Weight")))
        es.append(np.array(e.text.split(), float) * RY)
        c = np.zeros((nwfc, nb), complex)
        for i, w in enumerate(pr.findall("ATOMIC_WFC")):
            v = np.array(w.text.split(), float)
            c[i] = v[0::2] + 1j * v[1::2]
        cs.append(c)
    return np.array(ks), np.array(ws), np.array(es), np.array(cs), float(head.get("NUMBER_OF_ELECTRONS"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--pair", nargs=2, required=True, help="element names, e.g. Sn O")
    ap.add_argument("--rmax", type=float, required=True, help="max bond length in Angstrom")
    ap.add_argument("--rmin", type=float, default=0.5)
    ap.add_argument("--sigma", type=float, default=0.10, help="Gaussian broadening, eV")
    ap.add_argument("--emin", type=float, default=-20)
    ap.add_argument("--emax", type=float, default=10)
    ap.add_argument("--conj", action="store_true", help="flip the phase convention (sanity test)")
    args = ap.parse_args()

    alat, atoms, cell = read_structure(args.prefix)
    states = read_states("projwfc.out")
    k, w, e, c, nelec = read_proj(args.prefix)
    w = w / w.sum()
    nocc = int(round(nelec / 2))
    vbm = e[:, nocc - 1].max()
    e = e - vbm
    kc = k * 2 * np.pi / alat  # cartesian, 1/bohr
    if args.conj:
        c = c.conj()

    # spilling: how much of each occupied state the local basis misses
    spill = 1 - np.einsum("k,kin,kin->", w, c[:, :, :nocc].conj(), c[:, :, :nocc]).real / nocc

    # H_mu,nu(k) inside the projected subspace
    Hk = np.einsum("kin,kn,kjn->kij", c, e, c.conj())

    de = 0.01
    edges = np.arange(args.emin, args.emax + de / 2, de)
    egrid = 0.5 * (edges[1:] + edges[:-1])
    xk = np.arange(-5 * args.sigma, 5 * args.sigma + de / 2, de)
    kernel = np.exp(-(xk / args.sigma) ** 2 / 2)
    kernel /= kernel.sum()  # keeps the area unchanged
    total = np.zeros_like(egrid)
    per_orb = defaultdict(lambda: np.zeros_like(egrid))
    icohp_occ, nbonds, lengths = 0.0, 0, []
    icohp_orb = defaultdict(float)

    A, B = args.pair
    rng = range(-2, 3)
    for ia, (na, ta) in enumerate(atoms):
        if na != A:
            continue
        for ib, (nb_, tb) in enumerate(atoms):
            if nb_ != B or (A == B and ib < ia):
                continue
            for n1 in rng:
                for n2 in rng:
                    for n3 in rng:
                        T = n1 * cell[0] + n2 * cell[1] + n3 * cell[2]
                        d = np.linalg.norm(T + tb - ta) * BOHR
                        if not (args.rmin < d < args.rmax):
                            continue
                        if A == B and ia == ib and (n1, n2, n3) < (0, 0, 0):
                            continue
                        nbonds += 1
                        lengths.append(d)
                        ph = np.exp(1j * kc @ T)            # e^{ik.T}
                        mus = [i for i, s in enumerate(states) if s[0] == ia]
                        nus = [i for i, s in enumerate(states) if s[0] == ib]
                        for mu in mus:
                            for nu in nus:
                                # real-space hopping between (mu, cell 0) and (nu, cell T)
                                hT = np.sum(w * Hk[:, mu, nu] * ph.conj())
                                # weight of every state nk on this orbital pair (x2 for spin)
                                amp = 2 * (c[:, mu, :].conj() * c[:, nu, :] * ph[:, None] * hT).real
                                hist = np.histogram(e.ravel(), bins=edges, weights=(w[:, None] * amp).ravel())[0] / de
                                hist = np.convolve(hist, kernel, mode="same")
                                ends = [f"{A} {NLABEL.get((A, states[mu][2]), states[mu][2])}",
                                        f"{B} {NLABEL.get((B, states[nu][2]), states[nu][2])}"]
                                key = " - ".join(sorted(ends) if A == B else ends)
                                per_orb[key] += hist
                                total += hist
                                occ = np.sum(w[:, None] * amp[:, :nocc])
                                icohp_orb[key] += occ
                                icohp_occ += occ

    total /= nbonds
    for kk in per_orb:
        per_orb[kk] /= nbonds
        icohp_orb[kk] /= nbonds
    icohp_occ /= nbonds
    ipcohp = np.cumsum(total) * de

    name = f"{A}-{B}"
    keys = sorted(per_orb)
    cols = [egrid, -total, -ipcohp] + [-per_orb[kk] for kk in keys]
    header = "E-E_VBM(eV)  -pCOHP_total  -IpCOHP_total  " + "  ".join("-pCOHP[" + kk.replace(" ", "") + "]" for kk in keys)
    np.savetxt(f"pcohp_{name}.dat", np.array(cols).T, fmt="%.5f", header=header)

    gap = e[:, nocc].min() - 0.0
    lines = [
        f"system {args.prefix}: {name} bonds per cell = {nbonds}, d = {min(lengths):.3f}-{max(lengths):.3f} A",
        f"band gap (PBE) = {gap:.3f} eV, spilling (occupied) = {100 * spill:.2f} %",
        f"IpCOHP up to VBM, per bond = {icohp_occ:.3f} eV  (negative = net bonding)",
    ] + [f"  {kk}: {icohp_orb[kk]:.3f} eV" for kk in keys]
    with open("pcohp_summary.txt", "a") as f:
        f.write("\n".join(lines) + "\n\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
