"""WALL-E's decision making: what to do next, and when to head home.

Two layers:
1. SAFE RETURN (hard rule): never take an action unless, afterwards, the
   battery still covers the trip home plus a safety margin.
2. SEARCH (smart choice): among the safe actions, pick the one with the best
   "information (and chance of finding EVE) per unit of battery".
"""
from __future__ import annotations

import numpy as np

from .belief import ping_likelihood, sensor_params
from .config import Config
from .environment import manhattan
from .models import MOVES, Action, ClueType

# Order matters only for breaking exact ties (deterministic behaviour).
_CANDIDATES = [Action.SCAN, Action.PING, Action.UP, Action.DOWN, Action.LEFT, Action.RIGHT]
_TIE_BREAK = 1e-3


def _entropy(p: np.ndarray) -> float:
    nz = p[p > 1e-15]
    return float(-(nz * np.log2(nz)).sum())


class Policy:
    def __init__(self, config: Config):
        self.cfg = config

    # ---- costs -----------------------------------------------------------
    def action_cost(self, action: Action) -> int:
        b = self.cfg.battery
        if action in MOVES:
            return b.move_cost
        if action == Action.PING:
            return b.ping_cost
        if action == Action.SCAN:
            return b.scan_cost
        return 0

    # ---- safe-return rule ------------------------------------------------
    def is_safe(self, new_pos: tuple[int, int], battery_after: int) -> bool:
        """After the action: can we still get home with the margin to spare?"""
        b = self.cfg.battery
        trip_home = manhattan(new_pos, tuple(self.cfg.grid.base)) * b.move_cost
        return battery_after >= trip_home + b.safety_margin

    def _step_toward_base(self, pos: tuple[int, int]) -> Action:
        base = self.cfg.grid.base
        if pos[0] != base[0]:
            return Action.UP if pos[0] > base[0] else Action.DOWN
        return Action.LEFT if pos[1] > base[1] else Action.RIGHT

    # ---- value of sensing ------------------------------------------------
    def expected_info_gain(self, p: np.ndarray, pos: tuple[int, int], kind: ClueType) -> float:
        """Average drop in uncertainty (bits) if we sense from `pos`."""
        radius, p_near, p_false = sensor_params(self.cfg, kind)
        rows, cols = p.shape
        fired = ping_likelihood(rows, cols, pos, True, radius, p_near, p_false)
        h_after = 0.0
        for lik in (fired, 1.0 - fired):
            joint = p * lik
            prob = float(joint.sum())
            if prob > 1e-12:
                h_after += prob * _entropy(joint / prob)
        return _entropy(p) - h_after

    def sense_utility(self, p: np.ndarray, pos: tuple[int, int], kind: ClueType) -> float:
        """Value per battery unit of sensing at `pos`."""
        gain = self.expected_info_gain(p, pos, kind)
        if kind == ClueType.SCAN:
            chance_to_find = float(p[pos]) * self.cfg.sensor.scan_p_detect
            gain += self.cfg.policy.find_bonus * chance_to_find
            return gain / self.cfg.battery.scan_cost
        return gain / self.cfg.battery.ping_cost

    def _best_sense_after_move(self, p: np.ndarray, pos: tuple[int, int]) -> float:
        b = self.cfg.battery
        best = 0.0
        for kind, cost in ((ClueType.PING, b.ping_cost), (ClueType.SCAN, b.scan_cost)):
            gain = self.expected_info_gain(p, pos, kind)
            if kind == ClueType.SCAN:
                gain += self.cfg.policy.find_bonus * float(p[pos]) * self.cfg.sensor.scan_p_detect
            best = max(best, gain / (b.move_cost + cost))
        return best

    # ---- the decision ----------------------------------------------------
    def choose(self, belief, pos: tuple[int, int], battery: int) -> tuple[Action, str]:
        """Return (action, reason). reason is one of explore / safe_return / done."""
        p = belief.p
        rows, cols = p.shape
        peak = belief.most_likely()
        best_action, best_score = None, -np.inf

        for action in _CANDIDATES:
            cost = self.action_cost(action)
            if cost > battery:
                continue
            if action in MOVES:
                dr, dc = MOVES[action]
                new_pos = (pos[0] + dr, pos[1] + dc)
                if not (0 <= new_pos[0] < rows and 0 <= new_pos[1] < cols):
                    continue
            else:
                new_pos = pos
            if not self.is_safe(new_pos, battery - cost):
                continue
            # A move only makes sense if we can still sense afterwards;
            # otherwise it is not exploring, it is just wasting battery.
            if action in MOVES and not self.is_safe(
                new_pos, battery - cost - self.cfg.battery.ping_cost
            ):
                continue

            if action == Action.SCAN:
                score = self.sense_utility(p, pos, ClueType.SCAN)
            elif action == Action.PING:
                score = self.sense_utility(p, pos, ClueType.PING)
            else:
                score = self.cfg.policy.lookahead_discount * self._best_sense_after_move(p, new_pos)
                closer = manhattan(pos, peak) - manhattan(new_pos, peak)
                score += _TIE_BREAK * closer

            if score > best_score:
                best_action, best_score = action, score

        if best_action is not None:
            return best_action, "explore"

        # Nothing safe to explore with: go home, or stop if already there.
        base = tuple(self.cfg.grid.base)
        if pos == base:
            return Action.STOP, "done"
        return self._step_toward_base(pos), "safe_return"
