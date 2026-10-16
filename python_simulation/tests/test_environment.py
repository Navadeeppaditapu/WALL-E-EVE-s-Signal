from dataclasses import replace

from wall_e.config import Config
from wall_e.environment import GridEnvironment, InsufficientBatteryError
from wall_e.models import Action, ClueType, EveStatus
import pytest


def make_env(eve=(5, 5), **sensor_overrides):
    cfg = Config()
    if sensor_overrides:
        cfg = replace(cfg, sensor=replace(cfg.sensor, **sensor_overrides))
    env = GridEnvironment(cfg, seed=1)
    env.reset(eve_position=eve)
    return env


def test_starts_at_base_with_full_battery():
    env = make_env()
    assert env.position == (0, 0)
    assert env.battery == Config().battery.start


def test_move_costs_battery_and_changes_position():
    env = make_env()
    obs = env.step(Action.DOWN)
    assert obs.position == (1, 0)
    assert obs.battery == Config().battery.start - Config().battery.move_cost
    assert obs.clue == ClueType.NONE


def test_wall_bump_is_invalid_and_stays_put():
    env = make_env()
    obs = env.step(Action.UP)  # base is the top-left corner
    assert obs.position == (0, 0)
    assert obs.valid is False


def test_eve_never_starts_on_base():
    for seed in range(50):
        env = GridEnvironment(Config(), seed=seed)
        assert env.eve_position != env.base


def test_scan_finds_eve_only_in_her_cell():
    env = make_env(eve=(0, 1), scan_p_detect=1.0)
    assert env.step(Action.SCAN).eve_status == EveStatus.HIDDEN   # wrong cell
    env.step(Action.RIGHT)
    obs = env.step(Action.SCAN)
    assert obs.eve_status == EveStatus.FOUND and obs.fired is True


def test_ping_fires_when_near_if_perfect_sensor():
    env = make_env(eve=(0, 2), ping_p_detect_near=1.0, ping_p_false_alarm=0.0)
    assert env.step(Action.PING).fired is True
    far = make_env(eve=(9, 9), ping_p_detect_near=1.0, ping_p_false_alarm=0.0)
    assert far.step(Action.PING).fired is False


def test_same_seed_gives_same_hidden_eve():
    a = GridEnvironment(Config(), seed=3)
    b = GridEnvironment(Config(), seed=3)
    assert a.eve_position == b.eve_position


def test_action_beyond_battery_raises():
    cfg = Config()
    cfg = replace(cfg, battery=replace(cfg.battery, start=2, safety_margin=0))
    env = GridEnvironment(cfg, seed=1)
    env.step(Action.PING)
    env.step(Action.PING)
    with pytest.raises(InsufficientBatteryError):
        env.step(Action.PING)
