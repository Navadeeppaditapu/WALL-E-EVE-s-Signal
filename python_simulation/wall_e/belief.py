"""Bayesian belief: a probability for every cell, "is EVE here?"."""
from __future__ import annotations

import numpy as np

from .config import Config
from .models import ClueType, Observation

_FLOOR = 1e-12  # keeps any cell from ever becoming exactly impossible


class Belief:
    def __init__(self, rows: int, cols: int, prior: np.ndarray | None = None):
        grid = np.ones((rows, cols), dtype=float) if prior is None else np.array(prior, dtype=float)
        if grid.shape != (rows, cols):
            raise ValueError("prior shape must match grid size")
        if grid.min() < 0 or grid.sum() <= 0:
            raise ValueError("prior must be non-negative with a positive total")
        self.p = grid / grid.sum()

    def update(self, likelihood: np.ndarray) -> None:
        """Bayes: new belief = old belief x likelihood, rescaled to sum to 1."""
        likelihood = np.asarray(likelihood, dtype=float)
        if likelihood.shape != self.p.shape:
            raise ValueError("likelihood shape must match belief shape")
        posterior = self.p * likelihood
        total = posterior.sum()
        if total <= 0:
            raise ValueError("observation is impossible under the current belief")
        posterior = np.maximum(posterior / total, _FLOOR)
        self.p = posterior / posterior.sum()

    def most_likely(self) -> tuple[int, int]:
        idx = np.unravel_index(np.argmax(self.p), self.p.shape)
        return int(idx[0]), int(idx[1])

    def entropy(self) -> float:
        """Uncertainty in bits: 0 = certain, log2(cells) = totally lost."""
        nz = self.p[self.p > 0]
        return float(-(nz * np.log2(nz)).sum())

    def copy(self) -> "Belief":
        return Belief(self.p.shape[0], self.p.shape[1], prior=self.p.copy())


def ping_likelihood(
    rows: int,
    cols: int,
    wall_e_pos: tuple[int, int],
    fired: bool,
    radius: int,
    p_detect_near: float,
    p_false_alarm: float,
) -> np.ndarray:
    """P(observation | EVE at each cell) for a noisy 'EVE is near' sensor.

    radius=0 makes it a 'check my own cell' sensor (used for scans).
    """
    r_idx, c_idx = np.indices((rows, cols))
    dist = np.abs(r_idx - wall_e_pos[0]) + np.abs(c_idx - wall_e_pos[1])
    p_fire = np.where(dist <= radius, p_detect_near, p_false_alarm)
    return p_fire if fired else 1.0 - p_fire


def sensor_params(cfg: Config, kind: ClueType) -> tuple[int, float, float]:
    """(radius, p_detect_near, p_false_alarm) for a sensor kind."""
    s = cfg.sensor
    if kind == ClueType.PING:
        return s.ping_radius, s.ping_p_detect_near, s.ping_p_false_alarm
    if kind == ClueType.SCAN:
        return 0, s.scan_p_detect, 0.0
    raise ValueError(f"{kind} is not a sensing clue")


def likelihood_for_observation(cfg: Config, obs: Observation) -> np.ndarray | None:
    """Turn an observation into a likelihood grid (None if it carries no clue)."""
    if obs.clue == ClueType.NONE or obs.fired is None:
        return None
    radius, p_near, p_false = sensor_params(cfg, obs.clue)
    return ping_likelihood(
        cfg.grid.rows, cfg.grid.cols, obs.position, obs.fired, radius, p_near, p_false
    )
