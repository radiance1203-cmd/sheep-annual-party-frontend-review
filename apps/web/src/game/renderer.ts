import Phaser from 'phaser';
import { RULES } from '@sheep/game-core';
import type { GameView } from '@sheep/game-core';
import { releaseAssets } from './assets';
import type { Atlas } from './assets';
import { animationFrame, fitFrame } from './presentation';

type ActorAtlas = 'sheep_side_v1' | 'sheep_iso8_v1' | 'dog_iso8_v1';
interface Actor { atlas: ActorAtlas; key: string; x: number; y: number; action: string; facing?: string; size: number }
interface PropOptions { alpha?: number; depth?: number; container?: Phaser.GameObjects.Container }
const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;

export function createRenderer(parent: HTMLElement, initial: GameView, atlases: Record<string, Atlas>) {
  let current = initial;
  let ready = false;
  let destroyed = false;
  let firstFrame: (drawn: boolean) => void = () => {};
  const readyFrame = new Promise<boolean>(resolve => { firstFrame = resolve; });
  const gameId = initial.game_id;
  const width = 360;
  const height = gameId === 'stack' ? RULES.stack.reference_view_height_u / 1000 : gameId === 'runner' ? RULES.runner.world_view_height_u / 1000 : RULES.herd.world_height_u / 1000;
  const farmAtlas = gameId === 'herd' ? 'farm_iso_v1' : 'farm_side_v1';
  class FarmScene extends Phaser.Scene {
    private graphics!: Phaser.GameObjects.Graphics;
    private actors!: Phaser.GameObjects.Container;
    private scenery!: Phaser.GameObjects.Container;
    private lastTick = -1;
    private previous: GameView | undefined;
    private motion = new Map<string, { action: string; start: number }>();
    private lastLandingTick = -100;
    private lastBumpTick = -100;

    create() {
      for (const [name, atlas] of Object.entries(atlases)) {
        if (!atlas.decodedImage) throw new Error('预检图片缺失');
        this.textures.addImage(name, atlas.decodedImage);
        const texture = this.textures.get(name);
        for (const [frameName, frame] of Object.entries(atlas.frames)) texture.add(frameName, 0, ...frame.rect);
      }
      this.scenery = this.add.container();
      this.backdrop();
      this.graphics = this.add.graphics();
      this.actors = this.add.container();
      ready = true;
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => firstFrame(true));
    }

    prop(frameName: string, x: number, y: number, size = 64, options: PropOptions = {}) {
      const frame = atlases[farmAtlas]?.frames[frameName];
      if (!frame) return;
      const sprite = this.add.image(x, y, farmAtlas, frameName)
        .setDisplaySize(size, size).setAlpha(options.alpha ?? 1).setDepth(options.depth ?? y)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]);
      (options.container ?? this.actors).add(sprite);
    }

    boundedProp(frameName: string, box: { x: number; y: number; width: number; height: number }, depth: number, tint?: number): boolean {
      const frame = atlases[farmAtlas]?.frames[frameName];
      if (!frame) return false;
      const placement = fitFrame(frame, box);
      const sprite = this.add.image(placement.x, placement.y, farmAtlas, frameName)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]).setScale(placement.scale).setDepth(depth);
      if (tint !== undefined) sprite.setTint(tint);
      this.actors.add(sprite);
      return true;
    }

    actor(actor: Actor) {
      const atlas = atlases[actor.atlas];
      if (!atlas) return;
      const facing = actor.facing ?? 'e';
      const action = `${actor.action}.${facing}`;
      const animation = atlas.animations[action] ?? atlas.animations[`idle.${facing}`];
      if (!animation) return;
      let motion = this.motion.get(actor.key);
      if (!motion || motion.action !== action || current.tick < motion.start) {
        motion = { action, start: current.tick }; this.motion.set(actor.key, motion);
      }
      const frameName = animationFrame(animation, current.tick - motion.start);
      if (!frameName) return;
      const frame = atlas.frames[frameName];
      if (!frame) return;
      const sprite = this.add.image(actor.x, actor.y, actor.atlas, frameName).setDisplaySize(actor.size, actor.size)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]).setDepth(actor.y);
      this.actors.add(sprite);
    }

    backdrop() {
      if (atlases.farm_backdrop_v3) {
        this.scenery.add(this.add.image(0, 0, 'farm_backdrop_v3', `backdrop_${gameId}`).setOrigin(0).setDisplaySize(width, height));
        const image = atlases.farm_backdrop_v3.objectUrl;
        // Decorative page extension does not alter the uniformly fitted game world.
        if (image) parent.closest<HTMLElement>('.game-page')?.style.setProperty('--game-scenery-image', `url("${image}")`);
        return;
      }
      const grassY = gameId === 'stack' ? 284 : gameId === 'runner' ? 94 : 0;
      const canvas = this.textures.createCanvas('farm-backdrop', width, height);
      if (canvas) {
        const context = canvas.getContext();
        const sky = context.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, gameId === 'herd' ? '#c3d68c' : '#91d4eb'); sky.addColorStop(1, '#e6eed0');
        context.fillStyle = sky; context.fillRect(0, 0, width, height);
        const meadow = context.createLinearGradient(0, grassY, 0, height);
        meadow.addColorStop(0, '#c7d987'); meadow.addColorStop(.55, '#a8c773'); meadow.addColorStop(1, '#83aa55');
        context.fillStyle = meadow; context.fillRect(0, grassY, width, height - grassY); canvas.refresh();
        this.scenery.add(this.add.image(0, 0, 'farm-backdrop').setOrigin(0));
      }
      const g = this.add.graphics(); this.scenery.add(g);
      if (gameId !== 'herd') {
        g.fillStyle(0xffffff, .64);
        for (const [x, y] of [[44, 34], [234, 20], [312, 58]] as const) { g.fillEllipse(x, y, 56, 15); g.fillEllipse(x - 13, y - 7, 27, 21); g.fillEllipse(x + 11, y - 10, 30, 25); }
        g.fillStyle(0x9abf72, .65); g.fillEllipse(65, grassY + 24, 260, 104); g.fillEllipse(320, grassY + 18, 240, 106);
      }
      // Scenery is cosmetic: no RNG, moving actor, gate or hit region lives here.
      const decorate = (frame: string, x: number, y: number, size: number, alpha = 1) => this.prop(frame, x, y, size, { alpha, container: this.scenery });
      const horizon = gameId === 'stack' ? 372 : gameId === 'runner' ? 151 : 52;
      decorate('tree', 24, horizon - 7, gameId === 'stack' ? 194 : 106, .9);
      decorate('tree', 260, horizon - 40, gameId === 'stack' ? 180 : 96, .72);
      decorate('barn', 315, horizon + 8, gameId === 'stack' ? 183 : 106);
      if (gameId !== 'herd') for (const x of [27, 91, 155, 219, 283, 347]) decorate('fence_segment', x, horizon + 16, 82, .78);
      // The tile source has a solid square base: keep the meadow continuous instead of stamping it.
      const tufts = gameId === 'herd' ? [[27, 118], [317, 142], [65, 184], [294, 217], [30, 292], [323, 332], [86, 370], [271, 392]] : [[44, height - 24], [74, height - 76], [292, height - 33], [326, height - 98]];
      g.lineStyle(1, 0x5d8c39, .35);
      for (const [x, y] of tufts) {
        if (x === undefined || y === undefined) continue;
        g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 6, y - 4); g.moveTo(x, y); g.lineTo(x, y - 6); g.moveTo(x + 4, y); g.lineTo(x + 6, y - 4); g.strokePath();
      }
      for (const x of [7, 347]) {
        decorate('bush', x, height - 10, gameId === 'stack' ? 112 : 72);
        decorate('hay_tray', x, horizon + 39, gameId === 'stack' ? 110 : 76);
        decorate('flower', x + (x < 20 ? 13 : -13), height - 9, 40);
        decorate('flower', x + (x < 20 ? 36 : -36), height - 21, 30, .85);
        if (gameId === 'stack') decorate('lantern', x + (x < 20 ? 9 : -9), 110, 70);
      }
      if (gameId === 'runner') {
        const ground = RULES.runner.ground_y_u / 1000;
        g.fillStyle(0xe6c98d); g.fillRect(0, ground, width, height - ground); g.fillStyle(0xf3dba8); g.fillRect(0, ground, width, 4);
        for (let x = 9; x < width; x += 29) { g.fillStyle(0xc5a768, .4); g.fillEllipse(x, ground + 16 + x % 7, 9, 2); }
      }
      if (gameId === 'herd') {
        g.fillStyle(0xe2eab9, .35); g.fillRect(0, 0, width, RULES.herd.fence_y_u / 1000);
        decorate('bush', 9, 155, 62, .8); decorate('bush', 354, 250, 68, .8);
      }
    }

    shadow(x: number, y: number, size: number, alpha = .16) { this.graphics.fillStyle(0x4b5729, alpha); this.graphics.fillEllipse(x, y + 2, size, Math.max(3, size / 4)); }

    drawStack(snapshot: Extract<GameView, { game_id: 'stack' }>) {
      // Shift only the visual camera; the extra 8px keeps the whole moving frame above the tower.
      const g = this.graphics, camera = Math.max(0, height * .42 + 8 - snapshot.top_support.center.y_u / 1000);
      const layer = (key: string, x: number, y: number, perfect = false, action = 'idle') => {
        const trayWidth = RULES.stack.tray_width_u / 1000;
        this.shadow(x, y + 5, trayWidth * .9, .12);
        if (!this.boundedProp('hay_tray_thin', { x: x - trayWidth / 2, y: y - 1, width: trayWidth, height: 6 }, y)) {
          // Old immutable releases remain renderable; their large rope prop cannot fit a 44-unit layer.
          g.fillStyle(perfect ? 0xe4b749 : 0xd9ae60); g.fillRoundedRect(x - trayWidth / 2, y - 1, trayWidth, 6, 2);
        }
        const compact = Boolean(atlases.sheep_side_v1?.animations[`stack_${action}.e`]);
        this.actor({ atlas: 'sheep_side_v1', key, x, y: y - 2, action: compact ? `stack_${action}` : action, size: compact ? 64 : 46 });
      };
      layer('foundation', RULES.stack.initial_top_x_u / 1000, RULES.stack.initial_top_y_u / 1000 + camera);
      for (const placed of snapshot.placed_layers.slice(-9)) {
        const last = placed.layer_no === snapshot.placed_layers.at(-1)?.layer_no;
        const action = snapshot.conclusion ? 'celebrate' : snapshot.moving_tray?.phase === 'SETTLE' && last ? 'steady' : 'idle';
        layer(`layer-${placed.layer_no}`, placed.center.x_u / 1000, placed.center.y_u / 1000 + camera, placed.perfect, action);
      }
      if (snapshot.moving_tray && snapshot.moving_tray.phase !== 'SETTLE') {
        const tray = snapshot.moving_tray;
        const progress = tray.phase === 'FALL' ? Math.max(0, Math.min(1, 1 - tray.phase_ticks_remaining / RULES.stack.fall_ticks)) : 0;
        layer('moving', tray.center.x_u / 1000, tray.center.y_u / 1000 + progress * RULES.stack.layer_height_u * 2 / 1000 + camera, false, tray.phase === 'FALL' ? 'air' : 'idle');
      }
    }

    drawRunner(snapshot: Extract<GameView, { game_id: 'runner' }>) {
      const g = this.graphics, ground = RULES.runner.ground_y_u / 1000;
      // The scenery is decorative; this independent edge follows the actual feet/obstacle ground.
      g.lineStyle(1, 0xb18f56, .65); g.lineBetween(0, ground, width, ground);
      const previous = this.previous?.game_id === 'runner' ? this.previous : undefined;
      if (previous && !previous.on_ground && snapshot.on_ground) this.lastLandingTick = snapshot.tick;
      if (previous && snapshot.stats.collision_count > previous.stats.collision_count) this.lastBumpTick = snapshot.tick;
      for (const obstacle of snapshot.obstacles) {
        const b = obstacle.bounds, x = b.min_x_u / 1000, y = b.min_y_u / 1000;
        const obstacleWidth = (b.max_x_u - b.min_x_u) / 1000, obstacleHeight = (b.max_y_u - b.min_y_u) / 1000;
        if (x < -50 || x > 410) continue;
        this.shadow(x + obstacleWidth / 2, ground, obstacleWidth + 5, .12);
        const variant = obstacleWidth <= 8 ? 'narrow' : obstacleWidth <= 18 ? 'medium' : 'wide';
        if (this.boundedProp(`hurdle_${variant}`, { x, y, width: obstacleWidth, height: obstacleHeight }, ground, obstacle.collision_recorded ? 0xb6aa94 : undefined)) continue;
        // Keep the visible bar inside the core AABB, including the narrow early hurdles.
        g.fillStyle(obstacle.collision_recorded ? 0x9d8b72 : 0x956039); g.fillRoundedRect(x, y, obstacleWidth, obstacleHeight, 2);
        g.fillStyle(0xf6d9a1); g.fillRect(x + 1, y + 2, Math.max(1, obstacleWidth - 2), 3);
        g.fillStyle(obstacle.collision_recorded ? 0xc1b294 : 0xe6754c); g.fillRect(x + 1, y + 7, Math.max(1, obstacleWidth - 2), 8);
        g.fillStyle(0xfff3d6); g.fillRect(x + 1, y + 15, Math.max(1, obstacleWidth - 2), 5);
      }
      const action = snapshot.conclusion ? 'celebrate' : snapshot.tick - this.lastBumpTick < 8 ? 'bump' : snapshot.on_ground ? snapshot.tick - this.lastLandingTick < 6 ? 'land' : 'run' : snapshot.sheep_vy_u_per_tick < 0 ? 'takeoff' : 'air';
      this.shadow(snapshot.sheep_foot.x_u / 1000, ground, 30, snapshot.on_ground ? .2 : .1);
      this.actor({ atlas: 'sheep_side_v1', key: 'runner', x: snapshot.sheep_foot.x_u / 1000, y: snapshot.sheep_foot.y_u / 1000, action, size: 56 });
      // Remaining pickups stay visible at their real core coordinates, even over the wool silhouette.
      for (const grass of snapshot.grass) {
        const x = grass.center.x_u / 1000, y = grass.center.y_u / 1000;
        if (x < -20 || x > 380) continue;
        const outer = RULES.runner.grass_outer_radius_u / 1000, inner = RULES.runner.grass_inner_radius_u / 1000;
        if (!grass.outer_collected) {
          if (!this.boundedProp('clover_outer_round', { x: x - outer, y: y - outer, width: outer * 2, height: outer * 2 }, y)) {
          g.fillStyle(0x70a83b); g.fillCircle(x - 1.8, y - 1.8, 2.6); g.fillCircle(x + 1.8, y - 1.8, 2.6); g.fillCircle(x - 1.8, y + 1.8, 2.6); g.fillCircle(x + 1.8, y + 1.8, 2.6);
          g.lineStyle(1, 0x355f29); g.strokeCircle(x, y, outer);
          }
        }
        if (!grass.inner_collected && !this.boundedProp('clover_core_round', { x: x - inner, y: y - inner, width: inner * 2, height: inner * 2 }, y + .1)) { g.fillStyle(0xfff7cb); g.fillCircle(x, y, inner); g.fillStyle(0xf4bd35); g.fillCircle(x, y, inner * .8); }
      }
    }

    drawHerd(snapshot: Extract<GameView, { game_id: 'herd' }>) {
      const g = this.graphics, fenceY = RULES.herd.fence_y_u / 1000;
      const [gateStart, gateEnd] = RULES.herd.gate_open_x_u;
      if (gateStart === undefined || gateEnd === undefined) throw new Error('规则中的围栏入口缺失。');
      const gateLeft = gateStart / 1000, gateRight = gateEnd / 1000;
      g.lineStyle(7, 0xa77a43); g.lineBetween(0, fenceY, gateLeft, fenceY); g.lineBetween(gateRight, fenceY, width, fenceY);
      for (const [left, right] of [[0, gateLeft], [gateRight, width]] as const) for (let x = left + 24; x < right; x += 48) this.prop('fence_segment', x, fenceY, 60, { depth: fenceY });
      // Gate guidance is ground paint; the opening and actors keep their core coordinates.
      const center = (gateLeft + gateRight) / 2;
      g.lineStyle(3, 0xffedaa, .8);
      for (const y of [105, 124, 143]) { g.beginPath(); g.moveTo(center - 9, y + 4); g.lineTo(center, y - 2); g.lineTo(center + 9, y + 4); g.strokePath(); }
      const previous = this.previous?.game_id === 'herd' ? this.previous : undefined;
      for (const sheep of snapshot.sheep) {
        const before = previous?.sheep.find(item => item.sheep_id === sheep.sheep_id);
        const moving = before && (before.center.x_u !== sheep.center.x_u || before.center.y_u !== sheep.center.y_u);
        const motion = this.motion.get(`sheep-${sheep.sheep_id}`);
        const entering = sheep.in_pen && (before && !before.in_pen || motion?.action.startsWith('enter.') && snapshot.tick - motion.start < 12);
        const action = entering ? 'enter' : sheep.in_pen ? 'idle' : moving ? 'walk' : 'idle';
        const x = sheep.center.x_u / 1000, y = sheep.center.y_u / 1000;
        this.shadow(x, y, 25);
        this.actor({ atlas: 'sheep_iso8_v1', key: `sheep-${sheep.sheep_id}`, x, y, action, facing: directions[sheep.facing_index] ?? 'e', size: 55 });
      }
      const dog = snapshot.dog, bark = snapshot.bark_ticks_remaining > 0;
      const dogMoving = previous && (previous.dog.center.x_u !== dog.center.x_u || previous.dog.center.y_u !== dog.center.y_u);
      if (bark) { g.lineStyle(2, 0xfff6cd, .8); g.strokeCircle(dog.center.x_u / 1000, dog.center.y_u / 1000, RULES.herd.bark_influence_radius_u / 1000); }
      this.shadow(dog.center.x_u / 1000, dog.center.y_u / 1000, 25);
      this.actor({ atlas: 'dog_iso8_v1', key: 'dog', x: dog.center.x_u / 1000, y: dog.center.y_u / 1000, action: bark ? 'bark' : dogMoving ? 'walk' : 'idle', facing: directions[dog.facing_index] ?? 'e', size: 72 });
      // Dog, sheep and fence share one foot-depth order.
      this.actors.sort('depth');
    }

    override update() {
      if (!ready || current.tick === this.lastTick) return;
      if (current.tick < this.lastTick) {
        // Practice restart/replay seek resets presentation history, never the core timeline.
        this.previous = undefined;
        this.motion.clear();
        this.lastLandingTick = -100;
        this.lastBumpTick = -100;
      }
      this.lastTick = current.tick;
      this.actors.removeAll(true); this.graphics.clear();
      if (current.game_id === 'stack') this.drawStack(current);
      else if (current.game_id === 'runner') this.drawRunner(current);
      else this.drawHerd(current);
      this.previous = current;
    }
  }
  const phaser = new Phaser.Game({ type: Phaser.AUTO, parent, width, height, transparent: true, scene: FarmScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, audio: { noAudio: true }, render: { antialias: true, pixelArt: false } });
  return { ready: readyFrame, render(value: GameView) { current = value; }, destroy() { if (destroyed) return; destroyed = true; ready = false; firstFrame(false); phaser.destroy(true); releaseAssets(atlases); } };
}
