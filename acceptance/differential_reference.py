"""Generate independent mathematical fixtures from the supplied Python references.
Synthetic inputs only: never evidence of human balance or device testing.
"""
import json
import random
from pathlib import Path
from stack_runner_reference import load_rules, simulate_stack, simulate_runner, RunnerSchedule, derive_runner_windows
from herd_reference import HerdSim, Action

rules = load_rules()
rng = random.Random(20261027)
rows = []
for game in ('stack', 'runner'):
    simulator = simulate_stack if game == 'stack' else simulate_runner
    schedule = RunnerSchedule(rules) if game == 'runner' else None
    logs = [[], [1], list(range(1, 1351)), rules[game]['golden_full_score_drop_ticks' if game == 'stack' else 'golden_full_score_jump_ticks']]
    logs += [sorted(rng.sample(range(1, 1351), rng.randint(8, 90))) for _ in range(12)]
    if game == 'runner':
        for window in derive_runner_windows(rules, schedule):
            probes = set()
            for key in ('safe_jump_ticks', 'grass_collect_jump_ticks', 'inner_collect_jump_ticks'):
                values = window[key]
                if values:
                    probes.update([values[0]-1, values[0], values[-1], values[-1]+1])
            logs += [[t] for t in sorted(probes)]
    for ticks in logs:
        result = simulator(rules, ticks) if game == 'stack' else simulator(rules, ticks, schedule)
        ticks = [t for t in ticks if t <= result['end_tick']]
        rows.append(dict(game=game, inputs=[dict(tick=t,seq=i+1,type='DROP' if game=='stack' else 'JUMP',value=None) for i,t in enumerate(ticks)], expected=result))

for mode in ('zero', 'random', 'up', 'up_bark', 'one'):
    sim = HerdSim(rules, 47)
    inputs = []
    samples = []
    while sim.end is None:
        tick = sim.tick+1
        if mode == 'random':
            x,y = rng.randint(-1000,1000), rng.randint(-1000,1000)
        elif mode in ('up','up_bark') or mode=='one' and tick==1:
            x,y = 0,-1000
        else:
            x,y = 0,0
        bark = mode=='up_bark' and tick>=sim.next_bark_tick or mode=='random' and tick%37==0
        if x or y:
            inputs.append(dict(tick=tick,seq=len(inputs)+1,type='DOG_MOVE',value=dict(x=x,y=y)))
        if bark:
            inputs.append(dict(tick=tick,seq=len(inputs)+1,type='BARK',value=None))
        sim.step(Action(x,y,bark))
        if tick in (1,2,60,61,120,121,450,900,1350) or sim.end:
            samples.append(dict(tick=tick,dog=list(sim.dog),sheep=[[s.id,s.x,s.y,s.in_pen] for s in sim.sheep],rng=sim.rng))
    rows.append(dict(game='herd',inputs=inputs,expected=sim.result(),samples=samples))
print(json.dumps(rows,separators=(',',':')))
