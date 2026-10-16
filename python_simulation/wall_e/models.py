"""Basic building blocks: actions, clue types, statuses, observations."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Action(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    PING = "PING"    # noisy "is EVE nearby?" clue
    SCAN = "SCAN"    # checks WALL-E's own cell
    STOP = "STOP"    # end the mission (only used back at base)


# (row change, column change) for each movement action
MOVES: dict[Action, tuple[int, int]] = {
    Action.UP: (-1, 0),
    Action.DOWN: (1, 0),
    Action.LEFT: (0, -1),
    Action.RIGHT: (0, 1),
}


class ClueType(str, Enum):
    NONE = "NONE"    # moving or stopping gives no clue
    PING = "PING"
    SCAN = "SCAN"


class EveStatus(str, Enum):
    HIDDEN = "HIDDEN"
    FOUND = "FOUND"


class Outcome(str, Enum):
    FOUND_EVE = "FOUND_EVE"
    RETURNED_SAFE = "RETURNED_SAFE"      # gave up safely, back at base
    TIMEOUT = "TIMEOUT"                  # ran out of time steps
    OUT_OF_BATTERY = "OUT_OF_BATTERY"    # should never happen (tests check this)


@dataclass(frozen=True)
class Observation:
    """What WALL-E gets back after every action."""
    clue: ClueType
    fired: bool | None          # did the clue go off? None if no clue
    position: tuple[int, int]
    battery: int
    steps_used: int
    eve_status: EveStatus
    valid: bool = True          # False if WALL-E bumped into a wall
