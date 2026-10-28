import type { StateHeader, StackView, RunnerView, HerdView, StackStats, RunnerStats, HerdStats, GameId } from './contracts/types.js';
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
export interface StackState extends Mutable<StateHeader<'stack'>> {
 phase:'READY'|'FALLING'|'SETTLING'|'ENDED'; x:number; direction:number; attempt:number; landing_tick:number; spawn_tick:number; drop_x:number;
 top_x:number; top_y:number; stats:StackStats; placed_layers:StackView['placed_layers'];
}
export interface RunnerState extends Mutable<StateHeader<'runner'>> {
 feet_y:number; vy:number; pending_until:number; distance_u:number;
 obstacles:{id:number;world_left:number;width:number;touched:boolean;passed:boolean}[];
 grass:{id:number;world_x:number;y:number;outer:boolean;inner:boolean}[];stats:RunnerStats;
}
export interface Sheep {
 id:number;x:number;y:number;in_pen:boolean;facing:number;stuck_ticks:number;sidestep_remaining:number;sidestep_dx:number;wall_guide_active:boolean;fence_contact_ticks:number;
}
export interface HerdState extends Mutable<StateHeader<'herd'>> {
 dog:{x:number;y:number;facing:number};sheep:Sheep[];rng:number;wander:readonly (readonly number[])[];
 bark_active_until:number;next_bark_tick:number;stats:HerdStats;
}
export type GameState=StackState|RunnerState|HerdState;
export type GameView=StackView|RunnerView|HerdView;
export type StateFor<G extends GameId>=Extract<GameState,{game_id:G}>;
