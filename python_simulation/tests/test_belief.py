import numpy as np
import pytest

from wall_e.belief import Belief, ping_likelihood

ROWS, COLS = 10, 10
PARAMS = dict(radius=2, p_detect_near=0.8, p_false_alarm=0.1)


def test_starts_uniform_and_sums_to_one():
    b = Belief(ROWS, COLS)
    assert b.p.sum() == pytest.approx(1.0)
    assert np.allclose(b.p, 1 / 100)


def test_belief_stays_normalized_after_updates():
    b = Belief(ROWS, COLS)
    for pos, fired in [((2, 2), True), ((5, 5), False), ((3, 4), True)]:
        b.update(ping_likelihood(ROWS, COLS, pos, fired, **PARAMS))
        assert b.p.sum() == pytest.approx(1.0)


def test_clue_firing_shifts_belief_toward_nearby_cells():
    b = Belief(ROWS, COLS)
    b.update(ping_likelihood(ROWS, COLS, (2, 2), True, **PARAMS))
    assert b.p[2, 2] > b.p[9, 9]
    nearby = {(r, c) for r in range(ROWS) for c in range(COLS)
              if abs(r - 2) + abs(c - 2) <= 2}
    assert b.most_likely() in nearby


def test_silent_clue_lowers_nearby_cells():
    b = Belief(ROWS, COLS)
    b.update(ping_likelihood(ROWS, COLS, (2, 2), False, **PARAMS))
    assert b.p[2, 2] < b.p[9, 9]


def test_entropy_drops_as_evidence_arrives():
    b = Belief(ROWS, COLS)
    start = b.entropy()
    for _ in range(3):
        b.update(ping_likelihood(ROWS, COLS, (2, 2), True, **PARAMS))
    assert b.entropy() < start


def test_impossible_observation_raises():
    b = Belief(ROWS, COLS)
    with pytest.raises(ValueError):
        b.update(np.zeros((ROWS, COLS)))


def test_copy_is_independent():
    b = Belief(ROWS, COLS)
    c = b.copy()
    c.update(ping_likelihood(ROWS, COLS, (0, 0), True, **PARAMS))
    assert np.allclose(b.p, 1 / 100)
