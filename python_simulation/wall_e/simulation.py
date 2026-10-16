"""Runs one full episode and records everything needed to replay/visualize it."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from .belief import Belief, likelihood_for_observation
from .config import Config
from .environment import GridEnvironment, InsufficientBatteryError
from .models import Action, EveStatus, Outcome
from .policy import Policy


def _frame(step, pos, action, reason, clue, fired, battery, belief, valid=True) -> dict[str, Any]:
    return {
        "step": step,
        "position": [int(pos[0]), int(pos[1])],
        "action": action,
        "reason": reason,
        "clue": clue,
        "fired": fired,
        "valid": valid,
        "battery": int(battery),
        "entropy": round(belief.entropy(), 4),
        "most_likely": list(belief.most_likely()),
        "belief": np.round(belief.p, 5).tolist(),
    }


def run_episode(cfg: Config, seed: int | None = None) -> dict[str, Any]:
    seed = cfg.simulation.seed if seed is None else seed
    env = GridEnvironment(cfg, seed=seed)
    belief = Belief(cfg.grid.rows, cfg.grid.cols)
    policy = Policy(cfg)

    frames = [_frame(0, env.position, None, "start", "NONE", None, env.battery, belief)]
    outcome = Outcome.TIMEOUT

    for step in range(1, cfg.simulation.max_steps + 1):
        action, reason = policy.choose(belief, env.position, env.battery)
        if action == Action.STOP:
            outcome = Outcome.RETURNED_SAFE
            break
        try:
            obs = env.step(action)
        except InsufficientBatteryError:
            outcome = Outcome.OUT_OF_BATTERY
            break

        likelihood = likelihood_for_observation(cfg, obs)
        if likelihood is not None:
            belief.update(likelihood)

        frames.append(
            _frame(step, obs.position, action.value, reason, obs.clue.value,
                   obs.fired, obs.battery, belief, obs.valid)
        )
        if obs.eve_status == EveStatus.FOUND:
            outcome = Outcome.FOUND_EVE
            break

    g, b, s = cfg.grid, cfg.battery, cfg.sensor
    return {
        "meta": {
            "rows": g.rows, "cols": g.cols, "base": list(g.base),
            "eve": list(env.eve_position), "seed": seed,
            "battery_start": b.start, "ping_radius": s.ping_radius,
        },
        "frames": frames,
        "outcome": outcome.value,
        "summary": {
            "steps": frames[-1]["step"],
            "battery_left": frames[-1]["battery"],
            "found": outcome == Outcome.FOUND_EVE,
            "final_entropy": frames[-1]["entropy"],
            "final_position": frames[-1]["position"],
        },
    }


def save_trajectory(trajectory: dict[str, Any], path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(trajectory), encoding="utf-8")
    return path
