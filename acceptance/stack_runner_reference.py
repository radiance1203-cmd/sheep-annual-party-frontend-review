#!/usr/bin/env python3
"""Portable V2.1 stack/runner integer rule reference; Python standard library.

Read ../config/game_rules.v2.1.json in this handoff package. No workspace or V2 dependency.
Self-test: python stack_runner_reference.py
Replay:    python stack_runner_reference.py --game runner --inputs jump_ticks.json
           python stack_runner_reference.py --game stack --inputs drop_ticks.json --seed 1

This is rule math for already normalized tick inputs. It is not a production
game, input/authentication validator, network deadline test, or human study.
"""
import argparse
import json
from pathlib import Path


def load_rules(path=None):
    return json.loads(Path(path or Path(__file__).resolve().parent.parent / "config" / "game_rules.v2.1.json").read_text(encoding="utf-8"))


def normalize_ticks(ticks, rules):
    ticks = list(ticks)
    c = rules["common"]
    if len(ticks) > c["max_input_events"]:
        raise ValueError("Too many input ticks")
    if any(type(t) is not int or t < c["input_tick_min"] or t > c["input_tick_max"] for t in ticks):
        raise ValueError("Every input tick must be an integer in the round")
    return set(ticks)


def simulate_stack(rules, drop_ticks, seed=1):
    c, s = rules["common"], rules["stack"]
    inputs = normalize_ticks(drop_ticks, rules)
    lo, hi = s["swing_min_x_u"], s["swing_max_x_u"]
    top = s["initial_top_x_u"]
    x = hi if seed & 1 else lo
    direction = -1 if x == hi else 1
    state = "READY"
    attempt = successes = perfects = misses = accepted = 0
    landing_tick = spawn_tick = -1
    drop_x = None
    end = "TIME_LIMIT"
    accepted_ticks, events = [], []
    for tick in range(1, c["max_ticks"] + 1):
        if state == "SETTLING" and tick == spawn_tick:
            attempt += 1
            x = hi if (seed ^ attempt) & 1 else lo
            direction = -1 if x == hi else 1
            state = "READY"
            # A noninitial spawn consumes its tick: no same-tick DROP or motion.
        elif state == "READY":
            if tick in inputs:
                accepted += 1
                accepted_ticks.append(tick)
                drop_x = x
                landing_tick = tick + s["fall_ticks"]
                state = "FALLING"
            else:
                speed = s["base_swing_speed_u_per_tick"] + s["speed_increment_u_per_tick"] * (successes // s["increase_every_success_layers"])
                x += direction * speed
                if x >= hi:
                    x, direction = 2 * hi - x, -1
                elif x <= lo:
                    x, direction = 2 * lo - x, 1
        elif state == "FALLING" and tick == landing_tick:
            delta = abs(drop_x - top)
            success = max(0, s["tray_width_u"] - delta) >= s["minimum_overlap_u"]
            perfect = success and delta <= s["perfect_center_error_u"]
            if success:
                successes += 1
                perfects += int(perfect)
                top = drop_x
            else:
                misses += 1
            events.append({"tick": tick, "error_u": delta, "success": success, "perfect": perfect})
            state, spawn_tick = "SETTLING", tick + s["settle_ticks"]
        if misses >= s["max_misses"]:
            end = "THREE_MISSES"
            break
        if successes >= s["max_success_layers"]:
            end = "GOAL_REACHED"
            break
    performance = s["points_per_success"] * successes + s["extra_points_per_perfect"] * perfects
    assert 0 <= performance <= c["performance_cap"]
    return {"end_tick": tick, "end_reason": end, "success": successes,
            "perfect": perfects, "misses": misses, "accepted": accepted,
            "performance": performance,
            "credited": c["participation_points"] + performance if accepted >= c["min_accepted_actions"] else 0,
            "accepted_ticks": accepted_ticks, "events": events}


def distance(r, tick):
    return sum(max(0, min(tick, s["end_tick"]) - s["start_tick"] + 1) * s["speed_u_per_tick"] for s in r["speed_segments"])


class RunnerSchedule:
    def __init__(self, rules):
        c, r = rules["common"], rules["runner"]
        self.collisions = [[] for _ in range(c["max_ticks"] + 1)]
        self.grasses = [[] for _ in range(c["max_ticks"] + 1)]
        self.passes = [[] for _ in range(c["max_ticks"] + 1)]
        self.obstacle_times = [[] for _ in range(r["obstacle_count"])]
        self.grass_positions = [[] for _ in range(r["grass_count"])]
        self.grass_by_obstacle = {g["obstacle_id"] - 1: g["id"] - 1 for g in r["grass_centers"]}
        for i, (pt, width, left) in enumerate(zip(r["obstacle_pass_ticks"], r["obstacle_widths_u"], r["obstacle_world_left_u"])):
            assert left == distance(r, pt) + r["sheep_body_x_min_u"] - width
            self.passes[pt].append(i)
        for g in r["grass_centers"]:
            i = g["obstacle_id"] - 1
            assert g["world_x_u"] == r["obstacle_world_left_u"][i] + r["obstacle_widths_u"][i] // 2
        for tick in range(1, c["max_ticks"] + 1):
            d = distance(r, tick)
            for i, (left0, width) in enumerate(zip(r["obstacle_world_left_u"], r["obstacle_widths_u"])):
                left = left0 - d
                if left < r["sheep_body_x_max_u"] and left + width > r["sheep_body_x_min_u"]:
                    self.collisions[tick].append(i)
                    self.obstacle_times[i].append(tick)
            for g in r["grass_centers"]:
                dx = g["world_x_u"] - d - r["pickup_point_x_u"]
                if abs(dx) <= r["grass_outer_radius_u"]:
                    i = g["id"] - 1
                    self.grasses[tick].append((i, dx * dx, g["y_u"]))
                    self.grass_positions[i].append((tick, dx * dx, g["y_u"]))


def simulate_runner(rules, jump_ticks, schedule=None):
    c, r = rules["common"], rules["runner"]
    inputs = normalize_ticks(jump_ticks, rules)
    schedule = schedule or RunnerSchedule(rules)
    ground = r["ground_y_u"]
    feet, vy, pending_until = ground, 0, -1
    touched = [False] * r["obstacle_count"]
    outer = [False] * r["grass_count"]
    inner = [False] * r["grass_count"]
    safe = mistakes = accepted = 0
    jumps, events = [], []
    for tick in range(1, c["max_ticks"] + 1):
        if tick in inputs:
            pending_until = tick + r["jump_buffer_extra_ticks"]
        if feet == ground and pending_until >= tick:
            vy = r["jump_initial_vy_u_per_tick"]
            pending_until = -1
            accepted += 1
            jumps.append(tick)
        if feet < ground or vy < 0:
            vy += r["gravity_u_per_tick_squared"]
            feet += vy
            if feet >= ground:
                feet, vy = ground, 0

        # A collision marks one mistake for this obstacle. It never deducts
        # existing points or terminates the round; no life/protection counter.
        if feet + r["body_bottom_relative_to_foot_u"] > r["obstacle_top_y_u"] and feet + r["body_top_relative_to_foot_u"] < ground:
            for i in schedule.collisions[tick]:
                if not touched[i]:
                    touched[i] = True
                    mistakes += 1
                    events.append([tick, "first_touch_mistake", i + 1])

        # Two independent once-only flags. Outer collection does not remove
        # the logical object or prevent an inner collection on a later tick.
        for i, dx2, gy in schedule.grasses[tick]:
            d2 = dx2 + (feet + r["pickup_point_y_relative_to_foot_u"] - gy) ** 2
            if not outer[i] and d2 <= r["grass_outer_radius_u"] ** 2:
                outer[i] = True
                events.append([tick, "grass_outer_plus_one", i + 1])
            if not inner[i] and d2 <= r["grass_inner_radius_u"] ** 2:
                inner[i] = True
                events.append([tick, "grass_inner_plus_one", i + 1])
        for i in schedule.passes[tick]:
            if not touched[i]:
                safe += 1
                events.append([tick, "safe_pass_plus_three", i + 1])
    outside, inside = sum(outer), sum(inner)
    performance = r["safe_pass_points"] * safe + r["grass_outer_points"] * outside + r["grass_inner_points"] * inside
    assert safe + mistakes == r["obstacle_count"]
    assert inside <= outside <= r["grass_count"]
    assert 0 <= performance <= c["performance_cap"]
    return {"end_tick": c["max_ticks"], "end_reason": "TIME_LIMIT",
            "safe_passed": safe, "mistakes": mistakes, "outer_collected": outside,
            "inner_collected": inside, "accepted": accepted, "performance": performance,
            "credited": c["participation_points"] + performance if accepted >= c["min_accepted_actions"] else 0,
            "accepted_ticks": jumps, "events": events,
            "touched_by_obstacle": touched, "outer_by_grass": outer, "inner_by_grass": inner}


def jump_feet(r, phase):
    if phase <= 0:
        return r["ground_y_u"]
    return min(r["ground_y_u"], r["ground_y_u"] + r["jump_initial_vy_u_per_tick"] * phase + r["gravity_u_per_tick_squared"] * phase * (phase + 1) // 2)


def derive_runner_windows(rules, schedule=None):
    r = rules["runner"]
    schedule = schedule or RunnerSchedule(rules)
    windows = []
    for i, pt in enumerate(r["obstacle_pass_ticks"]):
        safe, outside, inside = [], [], []
        gi = schedule.grass_by_obstacle.get(i)
        for start in range(pt - 60, pt + 1):
            hit = any(jump_feet(r, t - start + 1) + r["body_bottom_relative_to_foot_u"] > r["obstacle_top_y_u"] and jump_feet(r, t - start + 1) + r["body_top_relative_to_foot_u"] < r["ground_y_u"] for t in schedule.obstacle_times[i])
            if not hit:
                safe.append(start)
            if gi is not None:
                distances = [dx2 + (jump_feet(r, t-start+1) + r["pickup_point_y_relative_to_foot_u"] - gy)**2 for t,dx2,gy in schedule.grass_positions[gi]]
                if any(d <= r["grass_outer_radius_u"]**2 for d in distances):
                    outside.append(start)
                if any(d <= r["grass_inner_radius_u"]**2 for d in distances):
                    inside.append(start)
        windows.append({"obstacle_id": i+1, "safe_jump_ticks": safe,
                        "grass_collect_jump_ticks": outside,
                        "inner_collect_jump_ticks": inside,
                        "safe_and_grass_jump_ticks": sorted(set(safe) & set(outside)),
                        "safe_and_inner_jump_ticks": sorted(set(safe) & set(inside))})
    return windows


def assert_expected(result, expected):
    for key, value in expected.items():
        assert result[key] == value, (key, result[key], value)


def self_test(rules):
    c, s, r = rules["common"], rules["stack"], rules["runner"]
    schedule = RunnerSchedule(rules)
    stack = simulate_stack(rules, s["golden_full_score_drop_ticks"], s["golden_seed"])
    runner = simulate_runner(rules, r["golden_full_score_jump_ticks"], schedule)
    assert_expected(stack, s["golden_expected"])
    assert_expected(runner, r["golden_expected"])
    assert simulate_stack(rules, [], 1)["credited"] == 0
    assert_expected(simulate_runner(rules, [], schedule), rules["verification"]["runner_no_input_expected"])
    assert_expected(simulate_runner(rules, range(1, c["max_ticks"] + 1), schedule), rules["verification"]["runner_every_tick_input_expected"])
    windows = derive_runner_windows(rules, schedule)
    for actual, expected in zip(windows, rules["runner_window_expectations"]):
        assert_expected(actual, {k: expected[k] for k in actual})
        if actual["safe_and_inner_jump_ticks"]:
            assert set(actual["safe_and_inner_jump_ticks"]) < set(actual["safe_and_grass_jump_ticks"]) < set(actual["safe_jump_ticks"])
    out = {e[2]: e[0] for e in runner["events"] if e[1] == "grass_outer_plus_one"}
    inn = {e[2]: e[0] for e in runner["events"] if e[1] == "grass_inner_plus_one"}
    assert len(out) == len(inn) == r["grass_count"]
    assert any(out[i] < inn[i] for i in inn)
    example = rules["verification"]["separate_outer_and_inner_tick_example"]
    assert out[example["grass_id"]] == example["outer_tick"]
    assert inn[example["grass_id"]] == example["inner_tick"]
    # Cross-check analytical windows against actual single-jump replays at
    # safe/outer/inner boundaries and neighboring ticks for each obstacle.
    boundary_replays = 0
    for w in windows:
        oid = w["obstacle_id"] - 1
        gi = schedule.grass_by_obstacle.get(oid)
        probes = set()
        for key in ("safe_jump_ticks", "grass_collect_jump_ticks", "inner_collect_jump_ticks"):
            values = w[key]
            if values:
                probes.update([values[0]-1, values[0], values[-1], values[-1]+1])
        for tick in probes:
            replay = simulate_runner(rules, [tick], schedule)
            assert (not replay["touched_by_obstacle"][oid]) == (tick in w["safe_jump_ticks"])
            if gi is not None:
                assert replay["outer_by_grass"][gi] == (tick in w["grass_collect_jump_ticks"])
                assert replay["inner_by_grass"][gi] == (tick in w["inner_collect_jump_ticks"])
            boundary_replays += 1
    return {"status": "PASS", "rule_version": rules["rule_version"],
            "scope": "integer rule math only; not browser, server, network, ledger, or human validation",
            "stack_full_score": {k:stack[k] for k in s["golden_expected"]},
            "runner_full_score": {k:runner[k] for k in r["golden_expected"]},
            "verified_obstacle_windows": len(windows),
            "boundary_replay_cases": boundary_replays,
            "outer_then_later_inner_verified": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rules", type=Path)
    parser.add_argument("--game", choices=["stack", "runner"])
    parser.add_argument("--inputs", type=Path, help="JSON array of normalized input ticks")
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args()
    rules = load_rules(args.rules)
    if args.game:
        if args.inputs is None:
            parser.error("--game requires --inputs")
        ticks = json.loads(args.inputs.read_text(encoding="utf-8"))
        result = simulate_stack(rules, ticks, args.seed) if args.game == "stack" else simulate_runner(rules, ticks)
    else:
        result = self_test(rules)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
