import json
import tempfile
from pathlib import Path

import pytest

from wall_e.config import Config, config_from_dict, load_config


def test_default_config_loads():
    cfg = load_config("config.yaml")
    assert cfg.grid.rows == 10 and cfg.grid.cols == 10
    assert cfg.grid.base == (0, 0)


def test_no_path_gives_defaults():
    assert load_config() == Config()


def test_json_config_works():
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "c.json"
        path.write_text(json.dumps({"grid": {"rows": 5, "cols": 6}}))
        cfg = load_config(path)
    assert (cfg.grid.rows, cfg.grid.cols) == (5, 6)


def test_unknown_setting_is_rejected():
    with pytest.raises(ValueError):
        config_from_dict({"battery": {"strat": 10}})  # typo on purpose


def test_bad_probability_is_rejected():
    with pytest.raises(ValueError):
        config_from_dict({"sensor": {"scan_p_detect": 1.5}})


def test_base_outside_grid_is_rejected():
    with pytest.raises(ValueError):
        config_from_dict({"grid": {"rows": 4, "cols": 4, "base": [9, 9]}})
