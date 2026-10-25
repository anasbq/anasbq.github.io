# Input files for "Where is the chemical bond hiding?"

Calculations behind the article ([Arabic](../../articles/where-is-the-chemical-bond.html) · [English](../../en/articles/where-is-the-chemical-bond.html)).

- `si/`, `sno2/`: Quantum ESPRESSO inputs (`scf.in`, `projwfc.in`), LOBSTER inputs (`lobsterin`) and, for SnO2, `pp.x` inputs for the band-edge densities.
- `scripts/qe_pcohp.py`: projected COHP straight from `projwfc.x` output (used for the article's curves).
- `scripts/plot_lobster.py`: plots pDOS / -COHP / ICOHP from LOBSTER output, for comparison.
- `scripts/make_article_data.py`: builds the article's chart data and band-edge images.
- `scripts/run_all.sh`: pw.x -> LOBSTER -> plots for both systems.

Pseudopotentials (PAW, pslibrary 1.0.0, put them in `pseudo/`): `Si.pbe-n-kjpaw_psl.1.0.0.UPF`, `Sn.pbe-dn-kjpaw_psl.1.0.0.UPF`, `O.pbe-n-kjpaw_psl.1.0.0.UPF`.

Article workflow (no LOBSTER needed), in each system folder:

```bash
pw.x -in scf.in > scf.out
projwfc.x -in projwfc.in > projwfc.out
python3 ../scripts/qe_pcohp.py --prefix Si --pair Si Si --rmax 2.5 --emin -15 --emax 10              # in si/
python3 ../scripts/qe_pcohp.py --prefix SnO2 --pair Sn O --rmin 1.8 --rmax 2.2 --emin -22 --emax 12   # in sno2/
pp.x -in pp_cbm.in > pp_cbm.out; pp.x -in pp_vbm.in > pp_vbm.out                 # sno2/ only
```

Then, from this folder: `python3 scripts/make_article_data.py --si si --sno2 sno2`.

Tested with Quantum ESPRESSO 7.3.1: Si takes about 3 minutes and SnO2 about 12 minutes on 4 cores.
