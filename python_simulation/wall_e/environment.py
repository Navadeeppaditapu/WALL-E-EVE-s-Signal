"""The world: a grid, a hidden EVE, a battery, and a clock."""
from __future__ import annotations

import numpy as np

from .config import Config
from .models import MOVES, Action, ClueType, EveStatus, Observation


class InsufficientBatteryError(Exception):
    """Raised if an action costs more than the remaining battery."""


def manhattan(a: tuple[int, int], b: tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


class GridEnvironment:
    def __init__(self, config: Config, seed: int | None = None):
        self.cfg = config
        self.rng = np.random.default_rng(
            config.simulation.seed if seed is None else seed
        )
        self.reset()

    # ---- setup -----------------------------------------------------------
    def reset(self, eve_position: tuple[int, int] | None = None) -> Observation:
        g = self.cfg.grid
        self.base = tuple(g.base)
        if eve_position is None:
            cells = [
                (r, c)
                for r in range(g.rows)
                for c in range(g.cols)
                if (r, c) != self.base
            ]
            eve_position = cells[int(self.rng.integers(len(cells)))]
        self.eve_position = tuple(eve_position)   # hidden from WALL-E
        self.position = self.base
        self.battery = self.cfg.battery.start
        self.steps_used = 0
        self.status = EveStatus.HIDDEN
        return self._observe(ClueType.NONE, None)

    # ---- helpers ---------------------------------------------------------
    @property
    def distance_to_base(self) -> int:
        return manhattan(self.position, self.base)

    def _in_bounds(self, pos: tuple[int, int]) -> bool:
        return 0 <= pos[0] < self.cfg.grid.rows and 0 <= pos[1] < self.cfg.grid.cols

    def _observe(self, clue: ClueType, fired: bool | None, valid: bool = True) -> Observation:
        return Observation(
            clue=clue,
            fired=fired,
            position=self.position,
            battery=self.battery,
            steps_used=self.steps_used,
            eve_status=self.status,
            valid=valid,
        )

    def _cost(self, action: Action) -> int:
        b = self.cfg.battery
        if action in MOVES:
            return b.move_cost
        if action == Action.PING:
            return b.ping_cost
        if action == Action.SCAN:
            return b.scan_cost
        return 0  # STOP

    # ---- the one method that advances the world -------------------------
    def step(self, action: Action) -> Observation:
        cost = self._cost(action)
        if cost > self.battery:
            raise InsufficientBatteryError(f"{action.value} costs {cost}, battery is {self.battery}")

        self.steps_used += 1
        self.battery -= cost
        s = self.cfg.sensor

        if action in MOVES:
            dr, dc = MOVES[action]
            new_pos = (self.position[0] + dr, self.position[1] + dc)
            if self._in_bounds(new_pos):
                self.position = new_pos
                return self._observe(ClueType.NONE, None)
            return self._observe(ClueType.NONE, None, valid=False)  # bumped a wall

        if action == Action.PING:
            near = manhattan(self.position, self.eve_position) <= s.ping_radius
            p_fire = s.ping_p_detect_near if near else s.ping_p_false_alarm
            fired = bool(self.rng.random() < p_fire)
            return self._observe(ClueType.PING, fired)

        if action == Action.SCAN:
            fired = False
            if self.position == self.eve_position:
                fired = bool(self.rng.random() < s.scan_p_detect)
            if fired:
                self.status = EveStatus.FOUND
            return self._observe(ClueType.SCAN, fired)

        return self._observe(ClueType.NONE, None)  # STOP
