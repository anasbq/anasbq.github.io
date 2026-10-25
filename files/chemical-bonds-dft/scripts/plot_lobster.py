#!/usr/bin/env python3
"""Plot LOBSTER results (pDOS, -COHP, orbital-resolved -COHP, ICOHP table).

Usage (run inside the folder where lobster ran):
    python3 ../scripts/plot_lobster.py --title "Si"

Reads:  COHPCAR.lobster, ICOHPLIST.lobster, DOSCAR.LSO.lobster (or DOSCAR.lobster),
        ICOBILIST.lobster (optional)
Writes: pdos.png, cohp.png, cohp_orbitals.png, icohp_summary.txt, cohp_data.json
Energies are relative to the Fermi level / valence band maximum (E = 0), as LOBSTER writes them.
Needs: numpy, matplotlib
"""
import argparse
import json
import os
import re
from collections import defaultdict

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BOND = re.compile(r"No\.\d+:(?P<a>[A-Za-z]+\d+)(?:\[(?P<oa>[^\]]+)\])?->"
                  r"(?P<b>[A-Za-z]+\d+)(?:\[(?P<ob>[^\]]+)\])?\((?P<d>[\d.]+)\)")


def element(site):
    return re.sub(r"\d+", "", site)


def shell(orb):
    """'5s' -> '5s', '2p_x' -> '2p', '4d_xy' -> '4d'."""
    return orb.split("_")[0]


def read_cohpcar(path):
    with open(path) as f:
        lines = f.readlines()
    params = lines[1].split()
    n_entries, n_spin = int(params[0]), int(params[1])
    labels = [l.strip() for l in lines[2:2 + n_entries]]
    data = np.loadtxt(lines[2 + n_entries:])
    energy = data[:, 0]
    entries = []
    for i, lab in enumerate(labels):
        col = 1 + 2 * i
        cohp = data[:, col]
        if n_spin == 2:  # spin-down block follows all spin-up columns
            cohp = cohp + data[:, col + 2 * n_entries]
        m = BOND.match(lab)
        entries.append({"label": lab, "match": m, "cohp": cohp})
    return energy, entries


def bond_groups(entries):
    """Average -COHP per bond type (e.g. Sn-O) and per orbital pair (e.g. Sn 5s - O 2p)."""
    bonds = defaultdict(list)
    orbs = defaultdict(lambda: defaultdict(lambda: 0.0))
    for e in entries:
        m = e["match"]
        if not m:
            continue
        pair = "-".join(sorted([element(m["a"]), element(m["b"])]))
        bond_id = e["label"].split(":")[0]
        if m["oa"] is None:
            bonds[pair].append(-e["cohp"])
        else:
            # keep the first element of the sorted pair first in the orbital label
            ends = sorted([(element(m["a"]), shell(m["oa"])), (element(m["b"]), shell(m["ob"]))])
            key = f"{ends[0][0]} {ends[0][1]} - {ends[1][0]} {ends[1][1]}"
            orbs[key][bond_id] = orbs[key][bond_id] - e["cohp"]
    bonds = {k: np.mean(v, axis=0) for k, v in bonds.items()}
    orbs = {k: np.mean(list(v.values()), axis=0) for k, v in orbs.items()}
    return bonds, orbs


def read_doscar(path):
    with open(path) as f:
        lines = f.readlines()
    head = lines[5].split()
    nedos, efermi = int(float(head[2])), float(head[3])
    total = np.loadtxt(lines[6:6 + nedos])
    energy = total[:, 0] - efermi
    pdos = defaultdict(lambda: 0.0)
    i = 6 + nedos
    while i + nedos < len(lines) + 1 and i < len(lines):
        header = lines[i]
        orbitals = header.split(";")[-1].split()
        block = np.loadtxt(lines[i + 1:i + 1 + nedos])
        z = re.search(r"Z=\s*(\d+)", header)
        el = Z2EL.get(int(z.group(1)), f"Z{z.group(1)}") if z else "atom"
        ncol = block.shape[1] - 1
        spin = 2 if ncol == 2 * len(orbitals) else 1
        for j, orb in enumerate(orbitals):
            y = block[:, 1 + j * spin]
            if spin == 2:
                y = y + block[:, 2 + j * spin]
            pdos[f"{el} {shell(orb)}"] = pdos[f"{el} {shell(orb)}"] + y
        i += 1 + nedos
    return energy, total[:, 1], dict(pdos)


Z2EL = {1: "H", 6: "C", 7: "N", 8: "O", 14: "Si", 22: "Ti", 30: "Zn", 50: "Sn"}


def read_icohplist(path):
    rows = []
    with open(path) as f:
        for line in f:
            p = line.split()
            if not p or not p[0].isdigit():
                continue
            rows.append({"a": p[1], "b": p[2], "d": float(p[3]), "value": float(p[-1])})
    return rows


def summarize(rows, name):
    whole = [r for r in rows if "[" not in r["a"]]
    out = [f"{name} (integrated up to E_F, eV)"]
    groups = defaultdict(list)
    for r in whole:
        groups["-".join(sorted([element(r["a"]), element(r["b"])]))].append(r)
    for pair, rs in groups.items():
        vals = np.array([r["value"] for r in rs])
        ds = np.array([r["d"] for r in rs])
        out.append(f"  {pair}: {len(rs)} bonds, d = {ds.min():.3f}-{ds.max():.3f} A, "
                   f"mean {name} = {vals.mean():.3f}, min {vals.min():.3f}, max {vals.max():.3f}")
    orb = defaultdict(lambda: defaultdict(float))
    for r in rows:
        if "[" in r["a"]:
            ma = re.match(r"([A-Za-z]+)\d+\[([^\]]+)\]", r["a"])
            mb = re.match(r"([A-Za-z]+)\d+\[([^\]]+)\]", r["b"])
            ends = sorted([(ma[1], shell(ma[2])), (mb[1], shell(mb[2]))])
            orb[f"{ends[0][0]} {ends[0][1]} - {ends[1][0]} {ends[1][1]}"][(r["a"].split("[")[0], r["b"].split("[")[0], r["d"])] += r["value"]
    if orb:
        out.append("  per orbital pair (mean over bonds):")
        for k, v in sorted(orb.items()):
            out.append(f"    {k}: {np.mean(list(v.values())):.3f}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="")
    ap.add_argument("--emin", type=float, default=None)
    ap.add_argument("--emax", type=float, default=None)
    args = ap.parse_args()

    plt.rcParams.update({"font.size": 12, "axes.spines.top": False, "axes.spines.right": False})
    bond_col, anti_col = "#1f6fb2", "#c0392b"
    summary = []
    export = {"title": args.title}

    if os.path.exists("COHPCAR.lobster"):
        energy, entries = read_cohpcar("COHPCAR.lobster")
        bonds, orbs = bond_groups(entries)
        lo = args.emin if args.emin is not None else energy.min()
        hi = args.emax if args.emax is not None else energy.max()
        sel = (energy >= lo) & (energy <= hi)
        export["energy"] = energy[sel].round(3).tolist()
        export["bonds"] = {k: v[sel].round(4).tolist() for k, v in bonds.items()}
        export["orbitals"] = {k: v[sel].round(4).tolist() for k, v in orbs.items()}

        for name, curves in (("cohp.png", bonds), ("cohp_orbitals.png", orbs)):
            if not curves:
                continue
            fig, ax = plt.subplots(figsize=(4.5, 6))
            ax.axvline(0, color="0.6", lw=0.8)
            ax.axhline(0, color="0.3", lw=0.8, ls="--")
            for k, y in curves.items():
                ax.plot(y[sel], energy[sel], lw=1.6, label=k)
            if name == "cohp.png" and len(curves) == 1:
                y = list(curves.values())[0][sel]
                ax.fill_betweenx(energy[sel], 0, y, where=y > 0, color=bond_col, alpha=0.35, lw=0)
                ax.fill_betweenx(energy[sel], 0, y, where=y < 0, color=anti_col, alpha=0.35, lw=0)
            ax.set_xlabel("-COHP (eV)   ← antibonding | bonding →")
            ax.set_ylabel("E - E$_F$ (eV)")
            ax.set_ylim(lo, hi)
            ax.set_title(args.title)
            ax.legend(frameon=False, fontsize=9, loc="lower right")
            fig.tight_layout()
            fig.savefig(name, dpi=200)
            plt.close(fig)

    dos_file = next((f for f in ("DOSCAR.LSO.lobster", "DOSCAR.lobster") if os.path.exists(f)), None)
    if dos_file:
        energy, total, pdos = read_doscar(dos_file)
        lo = args.emin if args.emin is not None else energy.min()
        hi = args.emax if args.emax is not None else energy.max()
        sel = (energy >= lo) & (energy <= hi)
        fig, ax = plt.subplots(figsize=(4.5, 6))
        ax.fill_betweenx(energy[sel], 0, total[sel], color="0.85", lw=0, label="total")
        for k, y in pdos.items():
            if np.max(y[sel]) > 0.02 * np.max(total[sel]):
                ax.plot(y[sel], energy[sel], lw=1.5, label=k)
        ax.axhline(0, color="0.3", lw=0.8, ls="--")
        ax.set_xlabel("DOS (states/eV)")
        ax.set_ylabel("E - E$_F$ (eV)")
        ax.set_ylim(lo, hi)
        ax.set_xlim(left=0)
        ax.set_title(args.title)
        ax.legend(frameon=False, fontsize=9, loc="lower right")
        fig.tight_layout()
        fig.savefig("pdos.png", dpi=200)
        plt.close(fig)
        export["dos_energy"] = energy[sel].round(3).tolist()
        export["pdos"] = {k: v[sel].round(4).tolist() for k, v in pdos.items()}

    for fname, name in (("ICOHPLIST.lobster", "ICOHP"), ("ICOBILIST.lobster", "ICOBI")):
        if os.path.exists(fname):
            summary += summarize(read_icohplist(fname), name)

    if os.path.exists("lobsterout"):
        with open("lobsterout") as f:
            spill = [l.strip() for l in f if "spilling" in l.lower()]
        summary = spill + summary

    with open("icohp_summary.txt", "w") as f:
        f.write("\n".join(summary) + "\n")
    with open("cohp_data.json", "w") as f:
        json.dump(export, f)
    print("\n".join(summary))
    print("wrote: pdos.png cohp.png cohp_orbitals.png icohp_summary.txt cohp_data.json")


if __name__ == "__main__":
    main()
