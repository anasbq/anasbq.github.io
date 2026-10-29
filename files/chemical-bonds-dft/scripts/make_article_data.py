#!/usr/bin/env python3
"""Collect the numbers the article plots: pDOS (projwfc.x), -pCOHP (qe_pcohp.py)
and a slice through the SnO2 band densities (pp.x cubes).

Run from the dft-lobster folder after both systems are done:
    python3 scripts/make_article_data.py --si si --sno2 sno2 --out article_data.json
"""
import argparse
import glob
import json
import re

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BOHR = 0.529177210903


def vbm(folder):
    for line in open(f"{folder}/scf.out"):
        if "highest occupied" in line:
            hi = line.split(":")[1].split()
            return float(hi[0]), float(hi[1])


def smooth(v, step, sigma):
    x = np.arange(-4 * sigma, 4 * sigma + step / 2, step)
    k = np.exp(-(x / sigma) ** 2 / 2)
    return np.convolve(v, k / k.sum(), mode="same")


def pdos(folder, emin, emax, step, sigma=0.15):
    ev, ec = vbm(folder)
    out = {}
    for f in sorted(glob.glob(f"{folder}/*.pdos_atm#*")):
        m = re.search(r"atm#\d+\((\w+)\)_wfc#\d+\((\w)\)", f)
        d = np.loadtxt(f)
        key = f"{m[1]} {m[2]}"
        out[key] = out.get(key, 0) + d[:, 1]
        e = d[:, 0] - ev
    grid = np.arange(emin, emax + step / 2, step)
    return {k: smooth(np.interp(grid, e, v), step, sigma).round(2).tolist() for k, v in out.items()}, grid, ec - ev


def cohp(folder, pair, emin, emax, step):
    f = f"{folder}/pcohp_{pair}.dat"
    head = open(f).readline().split()[1:]
    d = np.loadtxt(f)
    grid = np.arange(emin, emax + step / 2, step)
    res = {}
    for i, h in enumerate(head[1:], start=1):
        res[h.replace("-pCOHP[", "").replace("]", "").replace("-pCOHP_total", "total")
            .replace("-IpCOHP_total", "icohp")] = np.interp(grid, d[:, 0], d[:, i]).round(4).tolist()
    return res


def read_cube(path):
    L = open(path).read().split("\n")
    nat = abs(int(L[2].split()[0]))
    g = [L[3 + i].split() for i in range(3)]
    n = [int(x[0]) for x in g]
    ax = np.array([[float(v) for v in x[1:]] for x in g])
    atoms = [(int(L[6 + i].split()[0]), np.array(L[6 + i].split()[2:5], float)) for i in range(nat)]
    data = np.array(" ".join(L[6 + nat:]).split(), float).reshape(n)
    return data, ax, atoms


def trilinear(data, frac):
    n = np.array(data.shape)
    x = (frac % 1.0) * n
    i0 = np.floor(x).astype(int)
    t = x - i0
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1]) * (t[:, 2] if dz else 1 - t[:, 2])
                out = out + w * data[(i0[:, 0] + dx) % n[0], (i0[:, 1] + dy) % n[1], (i0[:, 2] + dz) % n[2]]
    return out


def slice_png(folder, out_png):
    """(001) plane at z = 0 of rutile SnO2: Sn at the corners and two O on the face diagonal.
    Writes one image per band edge: <out_png stem>-vbm.png and -cbm.png."""
    for name in ("vbm", "cbm"):
        fig, ax_ = plt.subplots(figsize=(4.2, 4.2))
        data, vox, atoms = read_cube(f"{folder}/SnO2_{name}.cube")
        cell = np.array([vox[i] * data.shape[i] for i in range(3)])
        a_len = np.linalg.norm(cell[0]) * BOHR
        u = np.linspace(-0.15, 1.15, 320)
        U, V = np.meshgrid(u, u)
        frac = np.stack([U.ravel(), V.ravel(), 0 * U.ravel()], axis=1)
        rho = trilinear(data, frac).reshape(U.shape)
        rho = np.clip(rho / np.percentile(rho, 99), 0, 1)  # keep core spikes from hiding the shape
        ax_.contourf(U * a_len, V * a_len, rho, levels=np.linspace(0, 1, 11),
                     cmap="Greens" if name == "vbm" else "Oranges")
        inv = np.linalg.inv(cell)
        for z, pos in atoms:
            f = pos @ inv
            f -= np.floor(f)
            if abs(f[2]) > 1e-3 and abs(f[2] - 1) > 1e-3:
                continue
            for sx in (-1, 0, 1):
                for sy in (-1, 0, 1):
                    x, y = f[0] + sx, f[1] + sy
                    if -0.15 <= x <= 1.15 and -0.15 <= y <= 1.15:
                        sn = z == 50
                        ax_.plot(x * a_len, y * a_len, "o", ms=13 if sn else 9,
                                 mfc="#5A5D66" if sn else "#C2462A", mec="white", mew=1.2)
                        ax_.annotate("Sn" if sn else "O", (x * a_len, y * a_len), xytext=(9, 7),
                                     textcoords="offset points", fontsize=13, color="#1B1F1E")
        ax_.set_aspect("equal")
        ax_.set_xticks([])
        ax_.set_yticks([])
        for s in ax_.spines.values():
            s.set_visible(False)
        fig.tight_layout()
        fig.savefig(out_png.replace(".png", f"-{name}.png"), dpi=160, transparent=True)
        plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--si", default="si")
    ap.add_argument("--sno2", default="sno2")
    ap.add_argument("--out", default="article_data.json")
    ap.add_argument("--png", default="sno2_band_edges.png")
    a = ap.parse_args()

    step = 0.05
    si_pdos, si_e, si_gap = pdos(a.si, -13, 6, step)
    sn_pdos, sn_e, sn_gap = pdos(a.sno2, -21, 9, step)
    si_c = cohp(a.si, "Si-Si", -13, 6, step)
    sn_c = cohp(a.sno2, "Sn-O", -21, 9, step)
    r3 = lambda v: [round(x, 3) for x in v]
    both = lambda c, o: r3(np.add(c[f"Sn{o}-O2p"], c[f"Sn{o}-O2s"]))
    data = {
        "si": {"e0": -13, "step": step, "n": len(si_e), "gap": round(si_gap, 3), "pdos": si_pdos,
               "cohp": {"total": r3(si_c["total"]), "ss": r3(si_c["Si3s-Si3s"]), "sp": r3(si_c["Si3p-Si3s"]),
                        "pp": r3(si_c["Si3p-Si3p"])},
               "icohp": r3(si_c["icohp"])},
        "sno2": {"e0": -21, "step": step, "n": len(sn_e), "gap": round(sn_gap, 3), "pdos": sn_pdos,
                 "cohp": {"total": r3(sn_c["total"]), "s": both(sn_c, "5s"), "p": both(sn_c, "5p"),
                          "d": both(sn_c, "4d")},
                 "icohp": r3(sn_c["icohp"])},
    }
    with open(a.out, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    slice_png(a.sno2, a.png)
    print("wrote", a.out, a.png)


if __name__ == "__main__":
    main()
