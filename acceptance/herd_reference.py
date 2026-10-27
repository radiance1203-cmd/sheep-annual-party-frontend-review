#!/usr/bin/env python3
"""Portable frozen HERD V2.1 candidate, integer game logic only.

Read ../config/game_rules.v2.1.json in this handoff package. No dependency on V2/workspace.
Control policies are synthetic and do not represent human performance.
All vector normalization uses CEIL integer square root in this candidate.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, median

HERE = Path(__file__).resolve().parent


def trunc_div(a: int, b: int) -> int:
    assert b > 0
    return a//b if a >= 0 else -((-a)//b)


def ceil_sqrt(n: int) -> int:
    d = math.isqrt(n)
    return d+1 if d*d < n else d


def unit(x: int, y: int) -> tuple[int, int]:
    if x == 0 and y == 0:
        return 0, 0
    d = ceil_sqrt(x*x+y*y)
    ux, uy = trunc_div(x*1024,d), trunc_div(y*1024,d)
    assert ux*ux+uy*uy <= 1024*1024
    return ux, uy


def normalize_move(x: int, y: int) -> tuple[int, int]:
    assert type(x) is int and type(y) is int
    assert -1000 <= x <= 1000 and -1000 <= y <= 1000
    n=x*x+y*y
    if n > 1000000:
        d=ceil_sqrt(n)
        x,y=trunc_div(x*1000,d),trunc_div(y*1000,d)
    assert x*x+y*y <= 1000000
    return x,y


def clamp(v,lo,hi):
    return max(lo,min(hi,v))


def dist2(a,b):
    return (a[0]-b[0])**2+(a[1]-b[1])**2


def sweep_axis(pos,delta,fixed,walls,axis):
    target=pos+delta
    if delta==0:
        return pos
    other="y" if axis=="x" else "x"
    for wall in walls:
        lo,hi=wall[f"min_{axis}"],wall[f"max_{axis}"]
        olo,ohi=wall[f"min_{other}"],wall[f"max_{other}"]
        if not olo < fixed < ohi:
            continue
        if delta>0 and pos<=lo and target>lo:
            target=min(target,lo)
        if delta<0 and pos>=hi and target<hi:
            target=max(target,hi)
    return target


def sweep_move(x,y,dx,dy,walls,bounds):
    nx=clamp(sweep_axis(x,dx,y,walls,"x"),bounds[0],bounds[1])
    ny=clamp(sweep_axis(y,dy,nx,walls,"y"),bounds[2],bounds[3])
    return nx,ny


@dataclass(frozen=True)
class Action:
    x:int=0
    y:int=0
    bark:bool=False


@dataclass
class Sheep:
    id:int
    x:int
    y:int
    in_pen:bool=False
    pen_tick:int|None=None
    stuck_ticks:int=0
    sidestep_remaining:int=0
    sidestep_dx:int=0
    sidestep_count:int=0
    fence_contact_ticks:int=0
    wall_guide_active:bool=False
    wall_guide_count:int=0
    wall_contact_run:int=0
    max_wall_contact_run:int=0
    gate_zone_run:int=0
    max_gate_zone_run:int=0


class HerdSim:
    def __init__(self,config,seed=None,record=False):
        self.config=config
        self.c=config["herd"]
        self.common=config["common"]
        self.seed=self.c["official_seed"] if seed is None else seed
        assert type(self.seed) is int and 0<=self.seed<=0xffffffff
        self.rng=self.seed or self.common["rng"]["zero_seed_fallback"]
        self.tick=0
        self.dog=tuple(self.c["dog_initial_u"])
        self.sheep=[Sheep(i+1,*xy) for i,xy in enumerate(self.c["sheep_initial_centers_u"])]
        self.wander=[(0,0)]*8
        self.next_bark_tick=1
        self.bark_active_until=0
        self.accepted_moves=0
        self.accepted_barks=0
        self.barks_triggered=0
        self.empty_barks=0
        self.max_dog_step_squared=0
        self.max_sheep_normal_step_squared=0
        self.first_valid_tick=None
        self.end=None
        self.pen_events=[]
        self.record=record
        self.inputs=[]
        self.trace=[]
        self.seq=0
        self.dog_walls=[{"min_x":-9000,"max_x":369000,"min_y":67000,"max_y":85000}]
        if record:
            self.trace.append(self.snapshot())

    def active(self):
        return [s for s in self.sheep if not s.in_pen]

    def snapshot(self):
        return {"tick":self.tick,"dog":list(self.dog),"sheep":[[s.id,s.x,s.y,int(s.in_pen)] for s in self.sheep]}

    def rng_next(self):
        s=self.rng
        s^=(s<<13)&0xffffffff
        s^=s>>17
        s^=(s<<5)&0xffffffff
        self.rng=s&0xffffffff
        return self.rng

    def side_direction(self,s):
        gx=self.c["gate_attractor_u"][0]
        if s.x==gx:
            return -1 if s.id%2 else 1
        return 1 if s.x<gx else -1

    def step(self,action=None):
        """Absent tick MOVE is (0,0); actions are never held from last tick."""
        if action is None:
            action=Action()
        assert self.end is None
        self.tick+=1
        assert 1<=self.tick<=1350
        c=self.c
        if self.record:
            self.seq+=1
            self.inputs.append({"tick":self.tick,"seq":self.seq,"type":"DOG_MOVE","value":{"x":action.x,"y":action.y}})
            if action.bark:
                self.seq+=1
                self.inputs.append({"tick":self.tick,"seq":self.seq,"type":"BARK","value":None})
        # Sample/filter input, move dog, then process BARK request.
        mx,my=normalize_move(action.x,action.y)
        dx,dy=trunc_div(mx*3200,1000),trunc_div(my*3200,1000)
        assert dx*dx+dy*dy<=3200*3200
        old_dog=self.dog
        self.dog=sweep_move(*old_dog,dx,dy,self.dog_walls,c["dog_center_bounds_u"])
        actual_dog_step=dist2(old_dog,self.dog)
        assert actual_dog_step<=3200*3200
        self.max_dog_step_squared=max(self.max_dog_step_squared,actual_dog_step)
        if self.dog!=old_dog:
            self.accepted_moves+=1
            if self.first_valid_tick is None:
                self.first_valid_tick=self.tick
        if action.bark and self.tick>=self.next_bark_tick:
            self.barks_triggered+=1
            self.bark_active_until=self.tick+12
            self.next_bark_tick=self.tick+150
            if any(dist2(self.dog,(s.x,s.y))<=126000**2 for s in self.active()):
                self.accepted_barks+=1
                if self.first_valid_tick is None:
                    self.first_valid_tick=self.tick
            else:
                self.empty_barks+=1
        if (self.tick-1)%60==0:
            for i in range(8):
                self.wander[i]=tuple(c["direction_table_1024"][self.rng_next()&7])
        # All subsequent vector calculations see the same OLD sheep positions.
        active=self.active()
        radius=126000 if self.tick<self.bark_active_until else 84000
        updates=[]
        for s in active:
            px,py=s.x,s.y
            pressured=dist2((px,py),self.dog)<=radius*radius
            flee=unit(px-self.dog[0],py-self.dog[1]) if (px,py)!=self.dog else tuple(c["direction_table_1024"][(s.id-1)%8])
            neighbors=[]
            sx=sy=0
            for n in active:
                if n.id==s.id:
                    continue
                ax,ay=px-n.x,py-n.y
                n2=ax*ax+ay*ay
                if n2<=110000**2:
                    neighbors.append(n)
                if n2<30000**2:
                    distance=math.isqrt(n2)
                    ux,uy=unit(ax,ay)
                    sx+=trunc_div(ux*(30000-distance),30000)
                    sy+=trunc_div(uy*(30000-distance),30000)
            separation=unit(sx,sy)
            if neighbors:
                avgx=trunc_div(sum(n.x for n in neighbors),len(neighbors))
                avgy=trunc_div(sum(n.y for n in neighbors),len(neighbors))
                cohesion=unit(avgx-px,avgy-py)
            else:
                cohesion=(0,0)
            if pressured:
                gate=unit(180000-px,60000-py)
                v=(8*flee[0]+4*cohesion[0]+6*separation[0]+5*gate[0],8*flee[1]+4*cohesion[1]+6*separation[1]+5*gate[1])
                speed=2000
            else:
                w=self.wander[s.id-1]
                v=(2*cohesion[0]+6*separation[0]+w[0],2*cohesion[1]+6*separation[1]+w[1])
                speed=300
            ux,uy=unit(*v)
            dx,dy=trunc_div(ux*speed,1024),trunc_div(uy*speed,1024)
            assert dx*dx+dy*dy<=speed*speed
            self.max_sheep_normal_step_squared=max(self.max_sheep_normal_step_squared,dx*dx+dy*dy)
            # Priority: wall guide > legacy sidestep > ordinary movement.
            if s.wall_guide_active and (not pressured or 154000<=px<=206000):
                s.wall_guide_active=False
                s.fence_contact_ticks=0
            guiding=s.wall_guide_active
            sidestepping=s.sidestep_remaining>0 and not guiding
            if guiding:
                dx,dy=(1000 if px<180000 else -1000),0
                s.stuck_ticks=0
                s.sidestep_remaining=0
            elif sidestepping:
                dx,dy=s.sidestep_dx,0
                s.sidestep_remaining-=1
                if s.sidestep_remaining==0:
                    s.stuck_ticks=0
            nx,ny=sweep_move(px,py,dx,dy,c["expanded_sheep_fence_aabbs_u"],c["sheep_center_bounds_u"])
            assert dist2((px,py),(nx,ny))<=max(speed,1000)**2
            # Fence contact counts movement along the wall too.
            fence_blocked=pressured and dy<0 and ny>py+dy and ny==86000 and not 154000<=nx<=206000
            if not guiding:
                s.fence_contact_ticks=s.fence_contact_ticks+1 if fence_blocked else 0
                if s.fence_contact_ticks>=6:
                    s.wall_guide_active=True  # starts NEXT tick
                    s.wall_guide_count+=1
                    s.stuck_ticks=0
                    s.sidestep_remaining=0
            elif 154000<=nx<=206000:
                s.wall_guide_active=False
                s.fence_contact_ticks=0
            if not guiding and not sidestepping and not s.wall_guide_active:
                slow=dist2((px,py),(nx,ny))<=150**2
                s.stuck_ticks=s.stuck_ticks+1 if pressured and slow else 0
                if s.stuck_ticks>=30:
                    s.sidestep_count+=1
                    s.sidestep_dx=self.side_direction(s)*1000
                    s.sidestep_remaining=15  # starts NEXT tick, fixed direction
            updates.append((s,nx,ny))
        for s,nx,ny in updates:
            s.x,s.y=nx,ny
        # Goal events are committed after all sheep have moved.
        for s,nx,ny in updates:
            if 154000<=nx<=206000 and ny<=66000:
                s.in_pen=True
                s.pen_tick=self.tick
                self.pen_events.append({"tick":self.tick,"sheep_id":s.id})
            contact=not s.in_pen and ny==86000 and not 154000<=nx<=206000
            s.wall_contact_run=s.wall_contact_run+1 if contact else 0
            s.max_wall_contact_run=max(s.max_wall_contact_run,s.wall_contact_run)
            gate_zone=not s.in_pen and ny<=116000 and 124000<=nx<=236000
            s.gate_zone_run=s.gate_zone_run+1 if gate_zone else 0
            s.max_gate_zone_run=max(s.max_gate_zone_run,s.gate_zone_run)
        if all(s.in_pen for s in self.sheep):
            self.end="GOAL_REACHED"
        elif self.tick==1350:
            self.end="TIME_LIMIT"
        if self.record:
            self.trace.append(self.snapshot())

    def result(self,strategy="replay"):
        count=sum(s.in_pen for s in self.sheep)
        bonus=clamp((1200-self.tick)//30,0,32) if count==8 else 0
        performance=6*count+bonus
        accepted=self.accepted_moves+self.accepted_barks
        eligible=accepted>=1 and self.end in ("GOAL_REACHED","TIME_LIMIT")
        credited=20+performance if eligible else 0
        oldbonus=min(16,(1350-self.tick)//30) if count==8 else 0
        return {"synthetic":True,"rule_version":self.config["rule_version"],"strategy":strategy,"seed":self.seed,"in_pen":count,"end_tick":self.tick,"end_seconds":self.tick/30,"end":self.end,"base_performance":6*count,"time_bonus":bonus,"performance":performance,"credit":credited,"participation":20 if eligible else 0,"accepted_moves":self.accepted_moves,"accepted_barks":self.accepted_barks,"first_valid_tick":self.first_valid_tick,"barks_triggered":self.barks_triggered,"empty_barks":self.empty_barks,"pen_events":self.pen_events,"remaining_sheep":[[s.id,s.x,s.y] for s in self.active()],"wall_guide_count":sum(s.wall_guide_count for s in self.sheep),"sidestep_count":sum(s.sidestep_count for s in self.sheep),"max_wall_contact_ticks":max(s.max_wall_contact_run for s in self.sheep),"max_gate_zone_ticks":max(s.max_gate_zone_run for s in self.sheep),"max_dog_step_squared":self.max_dog_step_squared,"max_sheep_normal_step_squared":self.max_sheep_normal_step_squared,"legacy_v2_credit_recomputed_on_this_final_trajectory":20+8*count+oldbonus if eligible else 0}


def steer_to(sim,target,bark=False):
    dx,dy=target[0]-sim.dog[0],target[1]-sim.dog[1]
    d=ceil_sqrt(dx*dx+dy*dy)
    if d==0:
        return Action(bark=bark)
    den=max(3200,d)
    return Action(clamp(trunc_div(dx*1000,den),-1000,1000),clamp(trunc_div(dy*1000,den),-1000,1000),bark)


class Policy:
    """Same nine policy definitions as audit; exact positions, not humans."""
    def __init__(self,name):
        self.name=name
        self.target_id=None

    def __call__(self,sim):
        t=sim.tick+1
        if self.name=="zero_input":return Action()
        if self.name=="one_move_then_idle":return Action(0,-1000) if t==1 else Action()
        if self.name=="hold_up":return Action(0,-1000)
        if self.name=="hold_up_bark":return Action(0,-1000,t>=sim.next_bark_tick)
        active=sim.active()
        if not active:return Action()
        if self.name=="simple_chase":
            target=min(active,key=lambda s:(dist2((s.x,s.y),sim.dog),s.id))
            return steer_to(sim,(target.x,target.y),t>=sim.next_bark_tick)
        if self.name in ("centroid_behind_55","centroid_behind_55_bark"):
            center=(trunc_div(sum(s.x for s in active),len(active)),trunc_div(sum(s.y for s in active),len(active)))
            ux,uy=unit(center[0]-180000,center[1]-60000)
            target=(center[0]+trunc_div(ux*55000,1024),center[1]+trunc_div(uy*55000,1024))
            return steer_to(sim,target,self.name.endswith("_bark") and t>=sim.next_bark_tick)
        if self.name in ("orbit_behind_each","orbit_behind_each_bark"):
            s=next((s for s in active if s.id==self.target_id),None)
            if s is None:
                s=max(active,key=lambda s:(dist2((s.x,s.y),(180000,60000)),-s.id))
                self.target_id=s.id
            want=math.atan2(s.y-60000,s.x-180000)
            current=math.atan2(sim.dog[1]-s.y,sim.dog[0]-s.x)
            delta=(want-current+math.pi)%(2*math.pi)-math.pi
            d=math.isqrt(dist2(sim.dog,(s.x,s.y)))
            if abs(delta)>math.pi/6 and d<115000:
                angle=current+clamp(delta,-math.pi/6,math.pi/6)
                target=(s.x+round(math.cos(angle)*65000),s.y+round(math.sin(angle)*65000))
            else:
                target=(s.x+round(math.cos(want)*55000),s.y+round(math.sin(want)*55000))
            return steer_to(sim,target,self.name.endswith("_bark") and t>=sim.next_bark_tick and abs(delta)<math.pi/3)
        raise ValueError(self.name)


BASE_STRATEGIES=["zero_input","one_move_then_idle","hold_up","hold_up_bark","simple_chase","centroid_behind_55","centroid_behind_55_bark","orbit_behind_each","orbit_behind_each_bark"]


def simulate(config,seed,strategy,record=False):
    sim=HerdSim(config,seed,record)
    policy=Policy(strategy)
    while sim.end is None:
        sim.step(policy(sim))
    return sim.result(strategy),sim


def replay(config,seed,inputs,declared_end_tick):
    """Strict logical input adapter. Not an HTTP/authentication implementation."""
    assert len(inputs)<=4096
    seen={}
    frames=defaultdict(dict)
    lastseq=0
    lasttick=0
    for e in inputs:
        assert set(e)=={"tick","seq","type","value"}
        tick,seq=e["tick"],e["seq"]
        assert type(tick) is int and 1<=tick<=1350
        assert type(seq) is int and seq>0
        if seq in seen:
            assert e==seen[seq],"conflicting duplicate sequence"
            continue
        assert seq>lastseq and tick>=lasttick
        lastseq,lasttick=seq,tick
        seen[seq]=e
        kind=e["type"]
        assert kind in ("DOG_MOVE","BARK") and kind not in frames[tick]
        if kind=="DOG_MOVE":
            assert isinstance(e["value"],dict) and set(e["value"])=={"x","y"}
            normalize_move(e["value"]["x"],e["value"]["y"])
        else:
            assert e["value"] is None
        frames[tick][kind]=e["value"]
    assert 1<=declared_end_tick<=1350
    assert not frames or max(frames)<=declared_end_tick
    sim=HerdSim(config,seed)
    for tick in range(1,declared_end_tick+1):
        assert sim.end is None,"log continues after true ending"
        move=frames[tick].get("DOG_MOVE",{"x":0,"y":0})
        sim.step(Action(move["x"],move["y"],"BARK" in frames[tick]))
    assert sim.end is not None,"declared end not reached by simulation"
    return sim.result()


def summary(rows):
    grouped=defaultdict(list)
    for r in rows:grouped[r["strategy"]].append(r)
    out=[]
    for name,rr in grouped.items():
        times=[r["end_seconds"] for r in rr if r["in_pen"]==8]
        scores=[r["credit"] for r in rr]
        out.append({"synthetic":True,"strategy":name,"n":len(rr),"in_pen_histogram":dict(sorted(Counter(r["in_pen"] for r in rr).items())),"credit_histogram":dict(sorted(Counter(scores).items())),"all_eight_count":len(times),"full_100_count":scores.count(100),"credit_min":min(scores),"credit_median":median(scores),"credit_max":max(scores),"credit_mean":mean(scores),"full_times_min_median_max": [min(times),median(times),max(times)] if times else None,"max_wall_contact_seconds":max(r["max_wall_contact_ticks"] for r in rr)/30})
    return out


def fixture_checks(config):
    assert unit(0,0)==(0,0) and unit(1,1)==(512,512)
    assert normalize_move(1000,1000)==(706,706)
    assert normalize_move(1,1000)==(0,999)
    walls=config["herd"]["expanded_sheep_fence_aabbs_u"]
    bounds=config["herd"]["sheep_center_bounds_u"]
    for args,expected in [((153000,87000,0,-4000),(153000,86000)),((154000,87000,0,-4000),(154000,83000)),((153000,87000,2000,-4000),(155000,83000)),((155000,83000,-3000,-1000),(154000,82000))]:
        assert sweep_move(*args,walls,bounds)==expected
    points=[]
    for count,tick,expected in [(8,240,100),(8,241,99),(8,600,88),(8,900,78),(8,1200,68),(8,1350,68),(7,1350,62),(4,1350,44)]:
        v=20+6*count+(clamp((1200-tick)//30,0,32) if count==8 else 0)
        assert v==expected
        points.append({"sheep":count,"tick":tick,"expected_credit":expected})
    s=HerdSim(config,1)
    s.step(Action(0,-1000))
    dog=s.dog
    s.step()  # no DOG_MOVE -> zero, not last tick's direction
    assert s.dog==dog and s.accepted_moves==1
    return {"unit_1_1":[512,512],"move_1000_1000":[706,706],"move_1_1000":[0,999],"missing_move_stops":True,"wall_cases":4,"score_cases":points,"speed_limit_asserted_each_simulation_tick":True}


def validate_frozen_config(config):
    """Constants are frozen together with this reference, not live tuning knobs."""
    cc=config["common"];h=config["herd"]
    for key,value in {"tick_hz":30,"max_ticks":1350,"position_scale":1000,"direction_scale":1024,"participation_points":20,"performance_cap":80,"session_points_cap":100}.items():
        assert cc[key]==value,(key,cc[key],value)
    for key,value in {"sheep_count":8,"dog_max_displacement_u_per_tick":3200,"sheep_flee_speed_u_per_tick":2000,"sheep_idle_speed_u_per_tick":300,"normal_influence_radius_u":84000,"bark_influence_radius_u":126000,"bark_duration_ticks":12,"bark_cooldown_ticks":150,"cohesion_radius_u":110000,"separation_radius_u":30000,"points_per_sheep":6}.items():
        assert h[key]==value,(key,h[key],value)
    assert h["active_weights"]=={"flee":8,"cohesion":4,"separation":6,"gate":5}
    assert h["idle_weights"]=={"cohesion":2,"separation":6,"wander":1}
    assert h["time_bonus"]=={"requires_all_sheep":True,"cap":32,"reference_tick":1200,"ticks_per_point":30,"formula":"clamp(floor((1200-final_tick)/30),0,32)"}
    assert h["wall_guide"]["contact_ticks"]==6 and h["wall_guide"]["speed_u_per_tick"]==1000
    assert h["missing_dog_move_each_tick"]==[0,0]


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--config",type=Path,default=HERE.parent/"config"/"game_rules.v2.1.json")
    p.add_argument("--seeds",type=int,default=32)
    p.add_argument("--official-seed",type=int)
    p.add_argument("--out",type=Path,default=HERE/"results_final32")
    p.add_argument("--replay",type=Path)
    args=p.parse_args()
    config=json.loads(args.config.read_text())
    validate_frozen_config(config)
    if args.official_seed is not None:config["herd"]["official_seed"]=args.official_seed
    if args.replay:
        g=json.loads(args.replay.read_text())
        result=replay(config,g["seed"],g["inputs"],g["expected"]["end_tick"])
        for k,v in g["expected"].items():assert result[k]==v,(k,result[k],v)
        print(json.dumps({"golden_replay_passed":True,"result":result},ensure_ascii=False))
        return
    args.out.mkdir(parents=True,exist_ok=True)
    fixtures=fixture_checks(config)
    rows=[]
    for name in BASE_STRATEGIES:
        rr=[]
        for seed in range(1,args.seeds+1):
            row,_=simulate(config,seed,name)
            rows.append(row);rr.append(row)
        print(json.dumps(summary(rr)[0],ensure_ascii=False),flush=True)
    official=[]
    golden=None
    seed=config["herd"]["official_seed"]
    for name in BASE_STRATEGIES:
        row,sim=simulate(config,seed,name,True)
        official.append(row)
        if row["credit"]==100 and (golden is None or row["end_tick"]<golden[0]["end_tick"]):golden=(row,sim)
    (args.out/"run_results.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2)+"\n")
    (args.out/"summary.json").write_text(json.dumps(summary(rows),ensure_ascii=False,indent=2)+"\n")
    (args.out/"official_seed_results.json").write_text(json.dumps(official,ensure_ascii=False,indent=2)+"\n")
    (args.out/"fixtures.json").write_text(json.dumps(fixtures,ensure_ascii=False,indent=2)+"\n")
    fields=["synthetic","rule_version","strategy","seed","in_pen","end_tick","end_seconds","end","base_performance","time_bonus","performance","participation","credit","legacy_v2_credit_recomputed_on_this_final_trajectory","accepted_moves","accepted_barks","max_wall_contact_ticks","wall_guide_count","sidestep_count","max_dog_step_squared","max_sheep_normal_step_squared"]
    with (args.out/"run_results.csv").open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction="ignore");w.writeheader();w.writerows(rows)
    manifest={"synthetic":True,"human_tested":False,"rule_version":config["rule_version"],"official_seed":seed,"stress_seeds":list(range(1,args.seeds+1)),"stress_runs":len(rows),"official_seed_runs":len(official),"config_filename":args.config.name,"config_sha256":hashlib.sha256(args.config.read_bytes()).hexdigest(),"reference_filename":Path(__file__).name,"reference_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),"unit_normalization":"ceil_sqrt","input_normalization":"ceil_sqrt_direct","missing_move_each_tick":"zero","score_formula":"20 + 6*N + (N==8 ? clamp(floor((1200-finalTick)/30),0,32):0); only eligible normal endings","old_scores_are_counterfactual_on_final_trajectories":True}
    (args.out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    if golden is not None:
        row,sim=golden
        expected={k:row[k] for k in ["in_pen","end_tick","end","base_performance","time_bonus","performance","credit"]}
        payload={"synthetic":True,"rule_version":config["rule_version"],"seed":seed,"generated_by_strategy":row["strategy"],"config_sha256":manifest["config_sha256"],"expected":expected,"inputs":sim.inputs}
        check=replay(config,seed,payload["inputs"],row["end_tick"])
        assert all(check[k]==v for k,v in expected.items())
        (args.out/"golden_inputs.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
        (args.out/"golden_trace.json").write_text(json.dumps(sim.trace,ensure_ascii=False,separators=(",", ":"))+"\n")
        print(json.dumps({"official_seed_golden_passed":True,"seed":seed,"strategy":row["strategy"],"expected":expected},ensure_ascii=False),flush=True)
    else:
        print(json.dumps({"official_seed_golden_passed":False,"seed":seed,"known_full_score_stress_paths":[{"seed":r["seed"],"strategy":r["strategy"],"end_tick":r["end_tick"]} for r in rows if r["credit"]==100]},ensure_ascii=False),flush=True)


if __name__=="__main__":main()
