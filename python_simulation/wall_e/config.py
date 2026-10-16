"""Loads settings from a YAML or JSON file into typed, validated objects."""
from __future__ import annotations

import json
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class GridConfig:
    rows: int = 10
    cols: int = 10
    base: tuple[int, int] = (0, 0)


@dataclass(frozen=True)
class BatteryConfig:
    start: int = 100
    move_cost: int = 1
    ping_cost: int = 1
    scan_cost: int = 2
    safety_margin: int = 2


@dataclass(frozen=True)
class SensorConfig:
    ping_radius: int = 3
    ping_p_detect_near: float = 0.8
    ping_p_false_alarm: float = 0.1
    scan_p_detect: float = 0.9


@dataclass(frozen=True)
class PolicyConfig:
    find_bonus: float = 6.0
    lookahead_discount: float = 0.9


@dataclass(frozen=True)
class SimulationConfig:
    max_steps: int = 150
    seed: int = 7


@dataclass(frozen=True)
class Config:
    grid: GridConfig = field(default_factory=GridConfig)
    battery: BatteryConfig = field(default_factory=BatteryConfig)
    sensor: SensorConfig = field(default_factory=SensorConfig)
    policy: PolicyConfig = field(default_factory=PolicyConfig)
    simulation: SimulationConfig = field(default_factory=SimulationConfig)


def _build(cls: type, data: dict[str, Any] | None, section: str):
    data = dict(data or {})
    allowed = {f.name for f in fields(cls)}
    unknown = set(data) - allowed
    if unknown:
        raise ValueError(f"Unknown setting(s) in '{section}': {sorted(unknown)}")
    if "base" in data:
        data["base"] = tuple(data["base"])
    return cls(**data)


def validate(cfg: Config) -> None:
    g, b, s, p, m = cfg.grid, cfg.battery, cfg.sensor, cfg.policy, cfg.simulation
    if g.rows < 2 or g.cols < 2:
        raise ValueError("grid must be at least 2x2")
    if not (0 <= g.base[0] < g.rows and 0 <= g.base[1] < g.cols):
        raise ValueError("base must be inside the grid")
    if min(b.move_cost, b.ping_cost, b.scan_cost) < 1:
        raise ValueError("action costs must be at least 1")
    if b.safety_margin < 0 or b.start < b.safety_margin:
        raise ValueError("battery.start must cover the safety margin")
    for name in ("ping_p_detect_near", "ping_p_false_alarm", "scan_p_detect"):
        value = getattr(s, name)
        if not 0.0 <= value <= 1.0:
            raise ValueError(f"sensor.{name} must be between 0 and 1")
    if s.ping_radius < 0:
        raise ValueError("sensor.ping_radius must be >= 0")
    if p.find_bonus < 0 or not 0 < p.lookahead_discount <= 1:
        raise ValueError("policy values out of range")
    if m.max_steps < 1:
        raise ValueError("simulation.max_steps must be >= 1")


def config_from_dict(raw: dict[str, Any]) -> Config:
    raw = dict(raw or {})
    known = {"grid", "battery", "sensor", "policy", "simulation"}
    unknown = set(raw) - known
    if unknown:
        raise ValueError(f"Unknown config section(s): {sorted(unknown)}")
    cfg = Config(
        grid=_build(GridConfig, raw.get("grid"), "grid"),
        battery=_build(BatteryConfig, raw.get("battery"), "battery"),
        sensor=_build(SensorConfig, raw.get("sensor"), "sensor"),
        policy=_build(PolicyConfig, raw.get("policy"), "policy"),
        simulation=_build(SimulationConfig, raw.get("simulation"), "simulation"),
    )
    validate(cfg)
    return cfg


def load_config(path: str | Path | None = None) -> Config:
    """Load .yaml/.yml/.json. With no path, returns the built-in defaults."""
    if path is None:
        return Config()
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        raw = json.loads(text)
    else:
        raw = yaml.safe_load(text)
    return config_from_dict(raw)
