from wall_e.belief import Belief
from wall_e.config import Config
from wall_e.environment import manhattan
from wall_e.models import Action
from wall_e.policy import Policy

CFG = Config()
ROWS, COLS = CFG.grid.rows, CFG.grid.cols


def test_far_from_base_with_low_battery_heads_home():
    policy = Policy(CFG)
    pos = (9, 9)  # 18 steps from base
    battery = manhattan(pos, (0, 0)) + CFG.battery.safety_margin  # exactly enough
    action, reason = policy.choose(Belief(ROWS, COLS), pos, battery)
    assert reason == "safe_return"
    assert action in (Action.UP, Action.LEFT)  # moves that shorten the trip


def test_at_base_with_no_spare_battery_stops():
    policy = Policy(CFG)
    action, reason = policy.choose(Belief(ROWS, COLS), (0, 0), 0)
    assert action == Action.STOP and reason == "done"


def test_with_plenty_of_battery_it_explores():
    policy = Policy(CFG)
    action, reason = policy.choose(Belief(ROWS, COLS), (0, 0), CFG.battery.start)
    assert reason == "explore"
    assert action != Action.STOP


def test_policy_never_picks_an_unsafe_action():
    policy = Policy(CFG)
    b = Belief(ROWS, COLS)
    for r in range(ROWS):
        for c in range(COLS):
            for battery in range(0, 40):
                if battery < manhattan((r, c), (0, 0)) + CFG.battery.safety_margin:
                    continue  # already past the safe point; return-only is tested above
                action, reason = policy.choose(b, (r, c), battery)
                if action == Action.STOP:
                    continue
                cost = policy.action_cost(action)
                assert cost <= battery
                if reason == "explore":
                    # recompute the position after the action
                    from wall_e.models import MOVES
                    new = (r, c)
                    if action in MOVES:
                        d = MOVES[action]
                        new = (r + d[0], c + d[1])
                    assert policy.is_safe(new, battery - cost)


def test_info_gain_is_larger_near_the_middle_than_in_a_corner():
    policy = Policy(CFG)
    b = Belief(ROWS, COLS)
    from wall_e.models import ClueType
    corner = policy.expected_info_gain(b.p, (0, 0), ClueType.PING)
    middle = policy.expected_info_gain(b.p, (5, 5), ClueType.PING)
    assert middle > corner
