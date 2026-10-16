"""Run WALL-E's search and produce the trajectory + visualization.

Examples:
    python run_simulation.py                 # one run, default seed from config.yaml
    python run_simulation.py --seed 12       # a different hidden EVE location
    python run_simulation.py --batch 100     # success statistics over 100 seeds
"""
from __future__ import annotations

import argparse
from collections import Counter

from wall_e.config import load_config
from wall_e.simulation import run_episode, save_trajectory
from wall_e.visualize import write_visualization


def main() -> None:
    parser = argparse.ArgumentParser(description="WALL-E and EVE's Signal")
    parser.add_argument("--config", default="config.yaml", help="path to config (.yaml or .json)")
    parser.add_argument("--seed", type=int, default=None, help="random seed (default: from config)")
    parser.add_argument("--out", default="outputs", help="output folder")
    parser.add_argument("--batch", type=int, default=0,
                        help="run N seeds and print statistics (no files written)")
    args = parser.parse_args()

    cfg = load_config(args.config)

    if args.batch > 0:
        outcomes: Counter[str] = Counter()
        steps = []
        for seed in range(args.batch):
            result = run_episode(cfg, seed)
            outcomes[result["outcome"]] += 1
            steps.append(result["summary"]["steps"])
        print(f"Ran {args.batch} episodes")
        for name, count in outcomes.most_common():
            print(f"  {name:<15} {count:>4}  ({100 * count / args.batch:.1f}%)")
        print(f"  average steps: {sum(steps) / len(steps):.1f}")
        return

    result = run_episode(cfg, args.seed)
    traj_path = save_trajectory(result, f"{args.out}/trajectory.json")
    html_path = write_visualization(traj_path, f"{args.out}/visualization.html")
    s = result["summary"]
    print(f"Outcome:        {result['outcome']}")
    print(f"Hidden EVE at:  {tuple(result['meta']['eve'])}")
    print(f"Steps used:     {s['steps']}   Battery left: {s['battery_left']}")
    print(f"Trajectory:     {traj_path}")
    print(f"Visualization:  {html_path}  (open this file in your browser)")


if __name__ == "__main__":
    main()
