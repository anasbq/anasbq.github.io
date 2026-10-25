#!/bin/bash
# PBE0 run of both systems on a SLURM cluster. Edit the module lines for your cluster.
# Submit from the dft-lobster folder:  sbatch scripts/job_pbe0.slurm
#SBATCH --job-name=bonds-pbe0
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=64
#SBATCH --cpus-per-task=1
#SBATCH --mem=0
#SBATCH --time=24:00:00
#SBATCH --output=pbe0-%j.log

# module load quantum-espresso/7.3.1     # <- your cluster's module names
# module load python/3

export OMP_NUM_THREADS=1
export FUNC=pbe0
export MPI="srun"
# -nk: k-point pools (Si: 512 k-points, SnO2: 324). Each pool needs enough memory for EXX.
export PWFLAGS="-nk 8"
export LOBSTER=${LOBSTER:-$HOME/bin/lobster}

cd "$SLURM_SUBMIT_DIR"
bash scripts/run_all.sh
