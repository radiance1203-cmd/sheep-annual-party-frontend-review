import Phaser from 'phaser';
import {createContext,createState,step,view,canonicalJson,sha256Utf8,RULES} from '@sheep/game-core';
import type {GameState,GameView,RawInput} from '@sheep/game-core';
import {preloadAssets} from '../../src/game/assets';
import {createRenderer} from '../../src/game/renderer';
import type {ArtTrajectory} from './art-contracts';

export interface HarnessMetrics {tick:number;view:GameView;viewHash:string;canvas:{width:number;height:number;rect:DOMRectJSON};stage:DOMRectJSON;world:{width:number;height:number};decoded:{name:string;width:number;height:number}[];renderedFrames:{texture:string;frame:string;x:number;y:number;width:number;height:number}[];font:string;scrollWidth:number;viewportWidth:number;controls:{text:string;width:number;height:number;font:number}[]}
type DOMRectJSON={x:number;y:number;width:number;height:number;top:number;bottom:number;left:number;right:number};
interface Harness {load(trajectory:ArtTrajectory,manifestHash:string):Promise<void>;advance(tick:number):Promise<HarnessMetrics>;restartPrefix():Promise<HarnessMetrics>;debug(enabled:boolean):void;dispose():void}
declare global {interface Window {artHarness?:Harness}}
const stage=document.querySelector<HTMLElement>('#stage');const overlay=document.querySelector<SVGSVGElement>('#geometry');const label=document.querySelector<HTMLElement>('#state');
if(!stage||!overlay||!label)throw Error('Missing standalone art diagnostic host');
const parent=stage,svg=overlay,status=label;
let renderer:ReturnType<typeof createRenderer>|undefined;let phaser:Phaser.Game|undefined;let state:GameState|undefined;let trajectory:ArtTrajectory|undefined;let cursor=0;let decoded:HarnessMetrics['decoded']=[];let debugging=false;
// Capture the production renderer's actual Phaser instance in this standalone
// document. The subclass preserves constructor behavior and changes no scene,
// rule, collider, input, material or actor; no hook is added to product source.
const NativeGame=Phaser.Game;
class ObservedGame extends NativeGame {constructor(config:Phaser.Types.Core.GameConfig){super(config);phaser=this;}}
Phaser.Game=ObservedGame;
function shape(name:string,attributes:Record<string,string|number>):SVGElement{const e=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attributes))e.setAttribute(key,String(value));svg.append(e);return e;}
function geometry(snapshot:GameView):void{svg.replaceChildren();if(!debugging)return;const r=RULES.runner,h=RULES.herd;svg.setAttribute('viewBox',`0 0 360 ${snapshot.game_id==='stack'?480:snapshot.game_id==='runner'?220:420}`);
 if(snapshot.game_id==='runner'){
  for(const o of snapshot.obstacles){const b=o.bounds;shape('rect',{x:b.min_x_u/1000,y:b.min_y_u/1000,width:(b.max_x_u-b.min_x_u)/1000,height:(b.max_y_u-b.min_y_u)/1000,stroke:'#ff006e',fill:'none','stroke-width':.7});}
  for(const g of snapshot.grass)for(const radius of [r.grass_outer_radius_u,r.grass_inner_radius_u])shape('circle',{cx:g.center.x_u/1000,cy:g.center.y_u/1000,r:radius/1000,stroke:'#ff006e',fill:'none','stroke-width':.5});
  shape('rect',{x:r.sheep_body_x_min_u/1000,y:(snapshot.sheep_foot.y_u+r.body_top_relative_to_foot_u)/1000,width:(r.sheep_body_x_max_u-r.sheep_body_x_min_u)/1000,height:(r.body_bottom_relative_to_foot_u-r.body_top_relative_to_foot_u)/1000,stroke:'#0047ff',fill:'none','stroke-width':.7});
  shape('circle',{cx:r.pickup_point_x_u/1000,cy:(snapshot.sheep_foot.y_u+r.pickup_point_y_relative_to_foot_u)/1000,r:1,fill:'#0047ff'});
 }else if(snapshot.game_id==='herd'){
  for(const [x1,x2]of [[0,h.gate_open_x_u[0]!],[h.gate_open_x_u[1]!,h.world_width_u]] as const)shape('line',{x1:x1/1000,x2:x2/1000,y1:h.fence_y_u/1000,y2:h.fence_y_u/1000,stroke:'#ff006e','stroke-width':1});
  shape('circle',{cx:snapshot.dog.center.x_u/1000,cy:snapshot.dog.center.y_u/1000,r:h.dog_radius_u/1000,fill:'none',stroke:'#0047ff','stroke-width':.7});
  for(const sheep of snapshot.sheep)shape('circle',{cx:sheep.center.x_u/1000,cy:sheep.center.y_u/1000,r:h.sheep_radius_u/1000,fill:'none',stroke:'#ff006e','stroke-width':.7});
 }else{const camera=Math.max(0,480*.42+8-snapshot.top_support.center.y_u/1000);for(const layer of snapshot.placed_layers){const x=layer.center.x_u/1000,y=layer.center.y_u/1000+camera;shape('rect',{x:x-RULES.stack.tray_width_u/2000,y:y-1,width:RULES.stack.tray_width_u/1000,height:6,fill:'none',stroke:'#ff006e','stroke-width':.5});shape('circle',{cx:x,cy:y,r:1,fill:'#0047ff'});}}
}
async function metrics():Promise<HarnessMetrics>{if(!state)throw Error('No loaded core state');const snapshot=view(state);const canvas=parent.querySelector('canvas');if(!canvas)throw Error('Renderer canvas missing');const renderedFrames:HarnessMetrics['renderedFrames']=[];const collect=(objects:Phaser.GameObjects.GameObject[])=>{for(const object of objects){if(object instanceof Phaser.GameObjects.Container)collect(object.list);if(object instanceof Phaser.GameObjects.Image)renderedFrames.push({texture:object.texture.key,frame:String(object.frame.name),x:object.x,y:object.y,width:object.displayWidth,height:object.displayHeight});}};for(const scene of phaser?.scene.getScenes(true)??[])collect(scene.children.list);const rect=(e:Element)=>e.getBoundingClientRect().toJSON() as DOMRectJSON;return{tick:state.tick,view:snapshot,viewHash:await sha256Utf8(canonicalJson(snapshot)),canvas:{width:canvas.width,height:canvas.height,rect:rect(canvas)},stage:rect(parent),world:{width:360,height:state.game_id==='stack'?480:state.game_id==='runner'?220:420},decoded,renderedFrames,font:getComputedStyle(document.body).fontFamily,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,controls:[...document.querySelectorAll<HTMLElement>('button')].map(e=>({text:e.textContent??'',width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)}))};}
window.artHarness={
 async load(next,manifestHash){renderer?.destroy();renderer=undefined;state=undefined;phaser=undefined;trajectory=next;cursor=0;const context=createContext(next.game);const fresh=createState(context);parent.style.aspectRatio=`360 / ${next.game==='stack'?480:next.game==='runner'?220:420}`;const assets=await preloadAssets(next.game,'/assets/',manifestHash);decoded=Object.entries(assets).map(([name,a])=>({name,width:a.decodedImage?.naturalWidth??0,height:a.decodedImage?.naturalHeight??0}));renderer=createRenderer(parent,view(fresh),assets);if(!await renderer.ready)throw Error('Renderer destroyed before first frame');state=fresh;if(!phaser)throw Error('Diagnostic renderer instance missing');status.textContent=`${next.id} · core tick0 · standalone synthetic diagnostic`;geometry(view(fresh));},
 async advance(tick){if(!trajectory||!state||!renderer||!phaser)throw Error('Load a trajectory first');if(tick<state.tick)throw Error('Diagnostic seek is forward only; reload trajectory to restart');const context=createContext(trajectory.game);
  while(state.tick<tick){if(state.conclusion)throw Error('Requested tick after first natural end');const nextTick:number=state.tick+1;const inputs:RawInput[]=[];while(trajectory.inputs[cursor]?.tick===nextTick)inputs.push(trajectory.inputs[cursor++]!);state=step(context,state,{tick:nextTick,inputs}).state;renderer.render(view(state));
   // Replay every true core view through the production scene update so actor
   // motion history, landing/bump and depth reflect the legal prefix. This is a
   // standalone renderer diagnostic, not a simulated business/session runtime.
   for(const scene of phaser.scene.getScenes(true))scene.update(0,0);
  }
  status.textContent=`${trajectory.id} · real core tick${state.tick} · ${state.conclusion?'natural terminal':'legal input prefix'}`;geometry(view(state));await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return metrics();
 },
 async restartPrefix(){if(!trajectory||!renderer||!phaser)throw Error('Load a trajectory first');state=createState(createContext(trajectory.game));cursor=0;renderer.render(view(state));for(const scene of phaser.scene.getScenes(true))scene.update(0,0);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));return metrics();},
 debug(enabled){debugging=enabled;if(enabled)svg.removeAttribute('hidden');else svg.setAttribute('hidden','');if(state)geometry(view(state));},
 dispose(){renderer?.destroy();renderer=undefined;state=undefined;phaser=undefined;}
};
document.querySelector<HTMLButtonElement>('#toggle')?.addEventListener('click',()=>window.artHarness?.debug(!debugging));
