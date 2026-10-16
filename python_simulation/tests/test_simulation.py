import json
import tempfile
from pathlib import Path

from wall_e.config import load_config
from wall_e.models import Outcome
from wall_e.simulation import run_episode, save_trajectory
from wall_e.visualize import build_html, write_visualization

CFG = load_config("config.yaml")


def test_never_runs_out_of_battery_over_100_seeds():
    for seed in range(100):
        result = run_episode(CFG, seed)
        assert result["outcome"] != Outcome.OUT_OF_BATTERY.value
        assert all(f["battery"] >= 0 for f in result["frames"])


def test_always_ends_at_base_when_it_gives_up():
    for seed in range(100):
        result = run_episode(CFG, seed)
        if result["outcome"] == Outcome.RETURNED_SAFE.value:
            assert result["summary"]["final_position"] == list(CFG.grid.base)


def test_finds_eve_most_of_the_time():
    found = sum(run_episode(CFG, s)["summary"]["found"] for s in range(100))
    assert found >= 80   # measured around 94 with the default config


def test_same_seed_same_run():
    assert run_episode(CFG, 5) == run_episode(CFG, 5)


def test_different_seeds_give_different_eve_positions():
    spots = {tuple(run_episode(CFG, s)["meta"]["eve"]) for s in range(20)}
    assert len(spots) > 5


def test_trajectory_structure():
    result = run_episode(CFG, 3)
    assert {"meta", "frames", "outcome", "summary"} <= set(result)
    first = result["frames"][0]
    assert first["step"] == 0 and first["action"] is None
    for f in result["frames"]:
        assert len(f["belief"]) == CFG.grid.rows
        assert len(f["belief"][0]) == CFG.grid.cols
        assert abs(sum(sum(row) for row in f["belief"]) - 1.0) < 0.01


def test_uncertainty_ends_lower_than_it_starts():
    for seed in range(10):
        frames = run_episode(CFG, seed)["frames"]
        assert frames[-1]["entropy"] < frames[0]["entropy"]


def test_visualization_file_is_created_and_contains_the_data():
    result = run_episode(CFG, 2)
    with tempfile.TemporaryDirectory() as d:
        traj = save_trajectory(result, Path(d) / "trajectory.json")
        html = write_visualization(traj, Path(d) / "visualization.html")
        text = html.read_text(encoding="utf-8")
        assert "<canvas" in text and "WALL-E and EVE" in text
        assert json.loads(traj.read_text())["outcome"] == result["outcome"]


def test_html_has_no_external_links():
    html = build_html(run_episode(CFG, 2))
    assert "http://" not in html and "https://" not in html
