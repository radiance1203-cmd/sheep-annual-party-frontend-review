import Phaser from 'phaser';
import { RULES } from '@sheep/game-core';
import type { GameView, SimulationEvent } from '@sheep/game-core';
import { releaseAssets } from './assets';
import type { Atlas } from './assets';
import { animationFrame, fitFrame } from './presentation';
import { advanceStride, bufferLayout, clientToWorld, EventJournal, PresentationClock } from './presenter-state';
import type { DisplayEvent, PresentationMode } from './presenter-state';
import { r3FenceParts } from './r3-scenery';

type ActorAtlas = 'sheep_side_v1' | 'sheep_iso8_v1' | 'dog_iso8_v1' | 'dog_walk_bark_candidate' | 'sheep_stack_candidate';
interface Actor { atlas: ActorAtlas; key: string; x: number; y: number; action: string; facing?: string; size: number; uniformScale?: number }
interface PropOptions { alpha?: number; depth?: number; container?: Phaser.GameObjects.Container; id?: string }
const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;

export function createRenderer(parent: HTMLElement, initial: GameView, atlases: Record<string, Atlas>) {
  let current = initial;
  let previous: GameView | undefined;
  const displayClock = new PresentationClock();
  const journal = new EventJournal();
  let displayTime = 0;
  let epoch = 0;
  let sessionId = 'preview';
  let beganSession = false;
  let forceReset = false;
  let pendingLanding = false;
  let layout = bufferLayout(parent.clientWidth || 360, parent.clientHeight || 480, 360, initial.game_id === 'stack' ? 480 : initial.game_id === 'runner' ? 220 : 420, window.devicePixelRatio);
  let ready = false;
  let destroyed = false;
  let firstFrame: (drawn: boolean) => void = () => {};
  const readyFrame = new Promise<boolean>(resolve => { firstFrame = resolve; });
  const gameId = initial.game_id;
  const width = 360;
  const height = gameId === 'stack' ? RULES.stack.reference_view_height_u / 1000 : gameId === 'runner' ? RULES.runner.world_view_height_u / 1000 : RULES.herd.world_height_u / 1000;
  const farmAtlas = gameId === 'herd' ? 'farm_iso_v1' : 'farm_side_v1';
  const herdFenceParts = gameId === 'herd' ? r3FenceParts() : [];
  const page = parent.closest<HTMLElement>('.game-page') ?? parent.closest<HTMLElement>('[data-art-candidate="r3"]');
  const sceneryImage = atlases.farm_backdrop_v3?.objectUrl;
  const pageImage = atlases.r3_page_backdrop?.objectUrl ?? sceneryImage;
  const ownedScenery = sceneryImage ? `url("${sceneryImage}")` : '';
  const ownedPageImage = pageImage ? `url("${pageImage}")` : '';
  const titleImage = atlases.r3_ui_title?.objectUrl;
  const ownedTitleImage = titleImage ? `url("${titleImage}")` : '';
  let ownedSceneryTop = '';
  let ownedScenerySize = '';
  class FarmScene extends Phaser.Scene {
    private graphics!: Phaser.GameObjects.Graphics;
    private actors!: Phaser.GameObjects.Container;
    private scenery!: Phaser.GameObjects.Container;
    private motion = new Map<string, { action: string; start: number; stride: number; x: number; y: number; tick: number; distance: number }>();
    private sprites = new Map<string, Phaser.GameObjects.Image>();
    private touched = new Set<string>();
    private effects: { image: Phaser.GameObjects.Image; envelope: DisplayEvent; start: number; x: number; y: number; size: number }[] = [];
    private effectPool: Phaser.GameObjects.Image[] = [];
    private landingTime = -10000;
    private bumpTime = -10000;
    private jumpTime = -10000;
    private entered = new Map<number, number>();
    private spriteSerial = 0;

    create() {
      for (const [name, atlas] of Object.entries(atlases)) {
        if (name === 'r3_page_backdrop' || name.startsWith('r3_ui_') || name === 'farm_backdrop_v3' && atlas.candidateManifestHash) continue; // R3 scenery is one HTML background, not a second canvas plate.
        if (!atlas.decodedImage) throw new Error('预检图片缺失');
        this.textures.addImage(name, atlas.decodedImage);
        const texture = this.textures.get(name);
        for (const [frameName, frame] of Object.entries(atlas.frames)) texture.add(frameName, 0, ...frame.rect);
      }
      this.scenery = this.add.container();
      this.backdrop();
      this.graphics = this.add.graphics();
      this.actors = this.add.container();
      resize();
      // During Scene.create it may not yet appear in getScenes(true); configure its camera directly.
      this.cameras.main.setViewport(0, 0, layout.bufferWidth, layout.bufferHeight).setZoom(layout.zoom).centerOn(width / 2, height / 2);
      ready = true;
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => firstFrame(true));
    }

    prop(frameName: string, x: number, y: number, size = 64, options: PropOptions = {}) {
      const frame = atlases[farmAtlas]?.frames[frameName];
      if (!frame) return;
      const sprite = options.container ? this.add.image(x, y, farmAtlas, frameName) : this.reuse(options.id ?? `prop:${frameName}:${x}:${y}`, farmAtlas, frameName);
      sprite.setPosition(x, y)
        .setDisplaySize(size, size).setAlpha(options.alpha ?? 1).setDepth(options.depth ?? y)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]);
      if (options.container) options.container.add(sprite);
    }

    reuse(id: string, atlas: string, frame: string) {
      this.touched.add(id);
      let image = this.sprites.get(id);
      if (!image) { image = this.add.image(0, 0, atlas, frame).setName(`r2-sprite-${++this.spriteSerial}`); this.sprites.set(id, image); this.actors.add(image); }
      return image.setTexture(atlas, frame).setVisible(true).setAlpha(1).clearTint();
    }

    boundedProp(frameName: string, box: { x: number; y: number; width: number; height: number }, depth: number, tint?: number, id = frameName): boolean {
      const texture = frameName.startsWith('r3_fence_') ? 'r3_fence' : farmAtlas;
      const frame = atlases[texture]?.frames[frameName];
      if (!frame) return false;
      const placement = fitFrame(frame, box);
      const sprite = this.reuse(`bounded:${id}`, texture, frameName).setPosition(placement.x, placement.y)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]).setScale(placement.scale).setDepth(depth);
      if (tint !== undefined) sprite.setTint(tint);
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
      if (!motion) {
        motion = { action: actor.action, start: displayTime, stride: 0, x: actor.x, y: actor.y, tick: current.tick, distance: current.game_id === 'runner' ? current.distance_u : 0 }; this.motion.set(actor.key, motion);
      }
      if (motion.tick !== current.tick) {
        const displacement = actor.key === 'runner' && current.game_id === 'runner' ? Math.abs(current.distance_u - motion.distance) / 1000 : Math.hypot(actor.x - motion.x, actor.y - motion.y);
        motion.stride = advanceStride(motion.stride, { x: 0, y: 0 }, { x: displacement, y: 0 });
        motion.x = actor.x; motion.y = actor.y; motion.tick = current.tick;
        if (current.game_id === 'runner') motion.distance = current.distance_u;
      }
      if (motion.action !== actor.action) { motion.action = actor.action; motion.start = displayTime; }
      // Direction changes never restart gait. Root motion always remains core-owned.
      const walking = actor.action === 'walk' || actor.action === 'run' || actor.action === 'walk_bark';
      const phaseTicks = walking ? motion.stride * .45 : (displayTime - motion.start) * RULES.common.tick_hz / 1000;
      const frameName = animationFrame(animation, phaseTicks);
      if (!frameName) return;
      const frame = atlas.frames[frameName];
      if (!frame) return;
      const sprite = this.reuse(`actor:${actor.key}`, actor.atlas, frameName).setPosition(actor.x, actor.y).setDisplaySize(actor.size, actor.size)
        .setOrigin(frame.pivot_px[0] / frame.rect[2], frame.pivot_px[1] / frame.rect[3]).setDepth(actor.y);
      // R3 common trim is rectangular: uniform scale preserves the native body silhouette.
      if (actor.uniformScale !== undefined) sprite.setScale(actor.uniformScale);
      sprite.setData({ action: actor.action, facing, phaseTicks });
    }

    backdrop() {
      if (atlases.farm_backdrop_v3) {
        const image = atlases.farm_backdrop_v3.objectUrl;
        // Decorative page extension does not alter the uniformly fitted game world.
        if (image) page?.style.setProperty('--game-scenery-image', ownedScenery);
        if (atlases.farm_backdrop_v3.candidateManifestHash) {
          page?.style.setProperty('--r3-page-scenery-image', ownedPageImage);
          page?.style.setProperty('--r3-title-image', ownedTitleImage);
          parent.dataset.candidateManifest = atlases.farm_backdrop_v3.candidateManifestHash;
          return; // The transparent canvas retains every core-owned actor, prop and gate.
        }
        this.scenery.add(this.add.image(0, 0, 'farm_backdrop_v3', `backdrop_${gameId}`).setOrigin(0).setDisplaySize(width, height));
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
        if (atlases.farm_backdrop_v3?.candidateManifestHash) { g.fillStyle(0x4b5729, .12); g.fillEllipse(x, y + 5, trayWidth * .9, 3); }
        else this.shadow(x, y + 5, trayWidth * .9, .12);
        if (!this.boundedProp('hay_tray_thin', { x: x - trayWidth / 2, y: y - 1, width: trayWidth, height: 6 }, y, undefined, `tray:${key}`)) {
          // Old immutable releases remain renderable; their large rope prop cannot fit a 44-unit layer.
          g.fillStyle(perfect ? 0xe4b749 : 0xd9ae60); g.fillRoundedRect(x - trayWidth / 2, y - 1, trayWidth, 6, 2);
        }
        const compact = Boolean(atlases.sheep_side_v1?.animations[`stack_${action}.e`]);
        const candidate = Boolean(atlases.sheep_stack_candidate?.animations[`stack_${action}.e`]);
        const uniform = candidate && atlases.farm_backdrop_v3?.candidateManifestHash ? { uniformScale: (RULES.stack.layer_height_u / 1000 - 8) / 126 } : {};
        this.actor({ atlas: candidate ? 'sheep_stack_candidate' : 'sheep_side_v1', key, x, y: y - 2, action: compact ? `stack_${action}` : action, size: compact ? 64 : 46, ...uniform });
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
      for (const obstacle of snapshot.obstacles) {
        const b = obstacle.bounds, x = b.min_x_u / 1000, y = b.min_y_u / 1000;
        const obstacleWidth = (b.max_x_u - b.min_x_u) / 1000, obstacleHeight = (b.max_y_u - b.min_y_u) / 1000;
        if (x < -50 || x > 410) continue;
        this.shadow(x + obstacleWidth / 2, ground, obstacleWidth + 5, .12);
        const variant = obstacleWidth <= 8 ? 'narrow' : obstacleWidth <= 18 ? 'medium' : 'wide';
        if (this.boundedProp(`hurdle_${variant}`, { x, y, width: obstacleWidth, height: obstacleHeight }, ground, obstacle.collision_recorded ? 0xb6aa94 : undefined, `hurdle:${obstacle.obstacle_id}`)) continue;
        // Keep the visible bar inside the core AABB, including the narrow early hurdles.
        g.fillStyle(obstacle.collision_recorded ? 0x9d8b72 : 0x956039); g.fillRoundedRect(x, y, obstacleWidth, obstacleHeight, 2);
        g.fillStyle(0xf6d9a1); g.fillRect(x + 1, y + 2, Math.max(1, obstacleWidth - 2), 3);
        g.fillStyle(obstacle.collision_recorded ? 0xc1b294 : 0xe6754c); g.fillRect(x + 1, y + 7, Math.max(1, obstacleWidth - 2), 8);
        g.fillStyle(0xfff3d6); g.fillRect(x + 1, y + 15, Math.max(1, obstacleWidth - 2), 5);
      }
      const action = snapshot.conclusion ? 'celebrate' : displayClock.mode === 'ready' ? 'idle' : displayTime - this.bumpTime < 260 ? 'bump' : snapshot.on_ground ? displayTime - this.landingTime < 200 ? 'land' : 'run' : displayTime - this.jumpTime < 100 ? 'takeoff' : 'air';
      this.shadow(snapshot.sheep_foot.x_u / 1000, ground, 30, snapshot.on_ground ? .2 : .1);
      this.actor({ atlas: 'sheep_side_v1', key: 'runner', x: snapshot.sheep_foot.x_u / 1000, y: snapshot.sheep_foot.y_u / 1000, action, size: 56 });
      // Remaining pickups stay visible at their real core coordinates, even over the wool silhouette.
      for (const grass of snapshot.grass) {
        const x = grass.center.x_u / 1000, y = grass.center.y_u / 1000;
        if (x < -20 || x > 380) continue;
        const outer = RULES.runner.grass_outer_radius_u / 1000, inner = RULES.runner.grass_inner_radius_u / 1000;
        if (!grass.outer_collected) {
          if (!this.boundedProp('clover_outer_round', { x: x - outer, y: y - outer, width: outer * 2, height: outer * 2 }, y, undefined, `outer:${grass.grass_id}`)) {
          g.fillStyle(0x70a83b); g.fillCircle(x - 1.8, y - 1.8, 2.6); g.fillCircle(x + 1.8, y - 1.8, 2.6); g.fillCircle(x - 1.8, y + 1.8, 2.6); g.fillCircle(x + 1.8, y + 1.8, 2.6);
          g.lineStyle(1, 0x355f29); g.strokeCircle(x, y, outer);
          }
        }
        if (!grass.inner_collected && !this.boundedProp('clover_core_round', { x: x - inner, y: y - inner, width: inner * 2, height: inner * 2 }, y + .1, undefined, `inner:${grass.grass_id}`)) { g.fillStyle(0xfff7cb); g.fillCircle(x, y, inner); g.fillStyle(0xf4bd35); g.fillCircle(x, y, inner * .8); }
      }
    }

    drawHerd(snapshot: Extract<GameView, { game_id: 'herd' }>) {
      const g = this.graphics, fenceY = RULES.herd.fence_y_u / 1000;
      const [gateStart, gateEnd] = RULES.herd.gate_open_x_u;
      if (gateStart === undefined || gateEnd === undefined) throw new Error('规则中的围栏入口缺失。');
      const gateLeft = gateStart / 1000, gateRight = gateEnd / 1000;
      if (atlases.r3_fence) {
        // A subtle inner-pen material zone, not a new wall or a painted fake gate.
        g.fillStyle(0xe4e6ae, .22); g.fillRect(0, 0, width, fenceY);
        g.fillStyle(0x39502a, .13); g.fillRect(0, fenceY + 1, gateLeft, 2); g.fillRect(gateRight, fenceY + 1, width - gateRight, 2);
        for (const part of herdFenceParts) {
          if (part.frame !== 'r3_fence_rails') g.fillEllipse(part.box.x + part.box.width / 2, fenceY + 1, part.box.width, 3);
          this.boundedProp(part.frame, part.box, fenceY + (part.frame === 'r3_fence_rails' ? 0 : .01), undefined, `fence:${part.frame}:${part.box.x}`);
        }
      } else {
        g.lineStyle(7, 0xa77a43); g.lineBetween(0, fenceY, gateLeft, fenceY); g.lineBetween(gateRight, fenceY, width, fenceY);
        for (const [left, right] of [[0, gateLeft], [gateRight, width]] as const) for (let x = left + 24; x < right; x += 48) this.prop('fence_segment', x, fenceY, 60, { depth: fenceY });
      }
      // Gate guidance is ground paint; the opening and actors keep their core coordinates.
      const center = (gateLeft + gateRight) / 2;
      g.lineStyle(3, 0xffedaa, .8);
      for (const y of [105, 124, 143]) { g.beginPath(); g.moveTo(center - 9, y + 4); g.lineTo(center, y - 2); g.lineTo(center + 9, y + 4); g.strokePath(); }
      const beforeView = previous?.game_id === 'herd' ? previous : undefined;
      for (const sheep of snapshot.sheep) {
        const before = beforeView?.sheep.find(item => item.sheep_id === sheep.sheep_id);
        const moving = before && (before.center.x_u !== sheep.center.x_u || before.center.y_u !== sheep.center.y_u);
        const entering = sheep.in_pen && displayTime - (this.entered.get(sheep.sheep_id) ?? -10000) < 400;
        const action = entering ? 'enter' : sheep.in_pen ? 'idle' : moving ? 'walk' : 'idle';
        const x = sheep.center.x_u / 1000, y = sheep.center.y_u / 1000;
        this.shadow(x, y, 25);
        this.actor({ atlas: 'sheep_iso8_v1', key: `sheep-${sheep.sheep_id}`, x, y, action, facing: directions[sheep.facing_index] ?? 'e', size: 55 });
      }
      const dog = snapshot.dog, bark = snapshot.bark_ticks_remaining > 0;
      const dogMoving = beforeView && (beforeView.dog.center.x_u !== dog.center.x_u || beforeView.dog.center.y_u !== dog.center.y_u);
      if (bark) { g.lineStyle(2, 0xfff6cd, .8); g.strokeCircle(dog.center.x_u / 1000, dog.center.y_u / 1000, RULES.herd.bark_influence_radius_u / 1000); }
      this.shadow(dog.center.x_u / 1000, dog.center.y_u / 1000, 25);
      const facing = directions[dog.facing_index] ?? 'e';
      const movingBark = dogMoving && bark;
      const candidateBark = movingBark && Boolean(atlases.dog_walk_bark_candidate?.animations[`walk_bark.${facing}`]);
      const dogAction = movingBark && (candidateBark || atlases.dog_iso8_v1?.animations[`walk_bark.${facing}`]) ? 'walk_bark' : dogMoving ? 'walk' : bark ? 'bark' : 'idle';
      this.actor({ atlas: candidateBark ? 'dog_walk_bark_candidate' : 'dog_iso8_v1', key: 'dog', x: dog.center.x_u / 1000, y: dog.center.y_u / 1000, action: dogAction, facing, size: 72 });
      parent.dataset.movingBarkSample = movingBark && dogAction !== 'walk_bark' ? 'head-combination-not-produced' : 'available';
      // Dog, sheep and fence share one foot-depth order.
      this.actors.sort('depth');
    }

    private eventEffect(envelope: DisplayEvent) {
      const { event, snapshot } = envelope;
      const confirmedAgeMs = Math.max(0, current.tick - event.tick) * 1000 / RULES.common.tick_hz;
      if (Math.max(displayTime - envelope.timeMs, confirmedAgeMs) > 1800 && event.type !== 'GAME_ENDED') { envelope.decorationOmitted = 'expired'; return; }
      if (event.type === 'JUMP_ACCEPTED') this.jumpTime = displayTime;
      if (event.type === 'OBSTACLE_COLLISION') this.bumpTime = displayTime;
      if (event.type === 'SHEEP_PENNED' && event.entity_id !== null) this.entered.set(event.entity_id, displayTime);
      const frame = ({ LAYER_LANDED: 'sparkle', LAYER_MISSED: 'dust', OBSTACLE_COLLISION: 'dust', GRASS_OUTER: 'sparkle', GRASS_INNER: 'sparkle', BARK_TRIGGERED: 'bark_wave', SHEEP_PENNED: 'entry_ring', GAME_ENDED: 'confetti' } as Partial<Record<SimulationEvent['type'], string>>)[event.type];
      if (!frame || !atlases.shared_v1?.frames[frame]) { envelope.decorationOmitted = 'no-decoration'; return; }
      if (this.effects.length >= 32) { envelope.decorationOmitted = 'pool-capacity'; return; }
      let x = 180, y = height / 2;
      if (snapshot.game_id === 'stack') { const p = snapshot.placed_layers.at(-1)?.center ?? snapshot.top_support.center; x = p.x_u / 1000; y = p.y_u / 1000 + Math.max(0, height * .42 + 8 - snapshot.top_support.center.y_u / 1000); }
      if (snapshot.game_id === 'runner') { const grass = snapshot.grass.find(g => g.grass_id === event.entity_id); x = grass && (event.type === 'GRASS_OUTER' || event.type === 'GRASS_INNER') ? grass.center.x_u / 1000 : snapshot.sheep_foot.x_u / 1000; y = grass && (event.type === 'GRASS_OUTER' || event.type === 'GRASS_INNER') ? grass.center.y_u / 1000 : snapshot.sheep_foot.y_u / 1000; }
      if (snapshot.game_id === 'herd') { const p = event.type === 'SHEEP_PENNED' ? snapshot.sheep.find(s => s.sheep_id === event.entity_id)?.center : snapshot.dog.center; if (p) { x = p.x_u / 1000; y = p.y_u / 1000; } }
      if (event.type === 'GAME_ENDED') { x = 180; y = height / 2; }
      const image = this.effectPool.pop() ?? this.add.image(0, 0, 'shared_v1', frame).setDepth(10000);
      image.setTexture('shared_v1', frame).setVisible(true).setOrigin(.5);
      this.effects.push({ image, envelope, start: displayTime, x, y, size: event.type === 'GAME_ENDED' ? 160 : 40 });
    }

    override update(time: number) {
      if (!ready) return;
      displayTime = displayClock.advance(time);
      if (forceReset) {
        this.motion.clear(); this.entered.clear();
        this.landingTime = this.bumpTime = this.jumpTime = -10000; pendingLanding = false;
        for (const effect of this.effects) { effect.image.setVisible(false); this.effectPool.push(effect.image); }
        this.effects = []; forceReset = false;
      }
      for (const event of journal.drain()) this.eventEffect(event);
      if (pendingLanding) { this.landingTime = displayTime; pendingLanding = false; }
      this.touched.clear(); this.graphics.clear();
      if (current.game_id === 'stack') this.drawStack(current);
      else if (current.game_id === 'runner') this.drawRunner(current);
      else this.drawHerd(current);
      for (const [id, image] of this.sprites) if (!this.touched.has(id)) { image.destroy(); this.sprites.delete(id); }
      this.effects = this.effects.filter(effect => {
        const duration = effect.envelope.event.type === 'GAME_ENDED' ? 3000 : 700;
        const age = displayTime - effect.start;
        if (age >= duration) { effect.image.setVisible(false); this.effectPool.push(effect.image); return false; }
        const p = Math.max(0, age / duration);
        effect.image.setPosition(effect.x + Math.sin(p * Math.PI * 4) * (duration > 1000 ? 28 : 3), effect.y - p * 24).setDisplaySize(effect.size * (1 + p * .4), effect.size * (1 + p * .4)).setAlpha(1 - p).setAngle(p * 50);
        return true;
      });
      parent.dataset.presentationTime = displayTime.toFixed(2);
      parent.dataset.eventCount = String(journal.history.length);
      parent.dataset.spriteCount = String(this.sprites.size);
      parent.dataset.effectCount = String(this.effects.length);
      alignPageScenery();
    }
    inspect() { return { spriteCreated: this.spriteSerial, sprites: [...this.sprites].map(([id, image]) => ({ id, instance: image.name, frame: image.frame.name, action: image.getData('action'), facing: image.getData('facing'), phaseTicks: image.getData('phaseTicks'), x: image.x, y: image.y })), effects: this.effects.length, pooledEffects: this.effectPool.length }; }
  }
  // Phaser 4.2.1 supports setGameSize for FIT. Buffer is the game size; camera alone maps the frozen world.
  const phaser = new Phaser.Game({ type: Phaser.AUTO, parent, width: layout.bufferWidth, height: layout.bufferHeight, transparent: true, scene: FarmScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, audio: { noAudio: true }, render: { antialias: true, pixelArt: false } });
  function resize() {
    if (destroyed || !phaser?.isBooted) return;
    // FIT in this exact Phaser version uses the parent's DOMRect (including border), not clientWidth.
    const bounds = parent.getBoundingClientRect();
    layout = bufferLayout(bounds.width, bounds.height, width, height, window.devicePixelRatio);
    // setGameSize refreshes FIT from cached parentSize. A React stage-height
    // transition must refresh that cache first or the canvas can be clipped.
    phaser.scale.getParentBounds();
    phaser.scale.setGameSize(layout.bufferWidth, layout.bufferHeight);
    for (const scene of phaser.scene.scenes) scene.cameras?.main?.setViewport(0, 0, layout.bufferWidth, layout.bufferHeight).setZoom(layout.zoom).centerOn(width / 2, height / 2);
    Object.assign(phaser.canvas.dataset, { phaserVersion: Phaser.VERSION, scaleMode: 'FIT', renderer: phaser.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS', effectiveDpr: String(layout.effectiveDpr), requestedDpr: String(layout.requestedDpr), worldWidth: String(width), worldHeight: String(height) });
    alignPageScenery();
  }
  function alignPageScenery() {
    const backdrop = atlases.r3_page_backdrop;
    if (page && backdrop?.decodedImage && backdrop.sceneryAnchorFraction !== undefined) {
      const pageRect = page.getBoundingClientRect(), canvasRect = phaser.canvas.getBoundingClientRect();
      const [imageWidth, imageHeight] = backdrop.size_px;
      const scale = Math.max(pageRect.width / imageWidth, pageRect.height / imageHeight);
      const anchorY = gameId === 'runner' ? RULES.runner.ground_y_u / 1000 : gameId === 'stack' ? RULES.stack.initial_top_y_u / 1000 : RULES.herd.fence_y_u / 1000;
      const nextTop = `${canvasRect.top - pageRect.top + anchorY / height * canvasRect.height - backdrop.sceneryAnchorFraction * imageHeight * scale}px`;
      const nextSize = `${imageWidth * scale}px ${imageHeight * scale}px`;
      // Flex layout can move a same-sized canvas without firing ResizeObserver.
      // Only scenery follows that movement; world camera and input map stay untouched.
      if (nextTop !== ownedSceneryTop) { ownedSceneryTop = nextTop; page.style.setProperty('--r3-page-scenery-top', nextTop); }
      if (nextSize !== ownedScenerySize) { ownedScenerySize = nextSize; page.style.setProperty('--r3-page-scenery-size', nextSize); }
    }
  }
  const observer = new ResizeObserver(resize); observer.observe(parent);
  window.addEventListener('resize', resize);
  const accept = (value: GameView) => {
    if (beganSession) { current = value; previous = undefined; pendingLanding = false; beganSession = false; return; }
    if (value.tick < current.tick) { journal.begin(sessionId, ++epoch); displayClock.reset(); forceReset = true; current = value; previous = undefined; pendingLanding = false; return; }
    if (value.tick !== current.tick) {
      if (value.game_id === 'runner' && current.game_id === 'runner' && !current.on_ground && value.on_ground) pendingLanding = true;
      previous = current;
    }
    current = value;
  };
  return {
    ready: readyFrame,
    render: accept,
    beginSession(id: string, restartEpoch: number) { sessionId = id; epoch = restartEpoch; journal.begin(sessionId, epoch); displayClock.reset(); previous = undefined; forceReset = true; beganSession = true; },
    presentStep(value: GameView, events: readonly SimulationEvent[]) { if (!beganSession && value.tick < current.tick) return; accept(value); journal.push(value, events, displayTime); if (value.conclusion) displayClock.mode = 'ended'; },
    setMode(mode: PresentationMode) { displayClock.mode = mode; },
    setPresentationTime(value: number | null) { displayClock.fixed = value; },
    clientToWorld(x: number, y: number) { return clientToWorld({ x, y }, phaser.canvas.getBoundingClientRect(), layout); },
    cameraToWorld(x: number, y: number) { const camera = phaser.scene.getScenes(true)[0]?.cameras.main; const point = camera?.getWorldPoint(x, y); return point ? { x: point.x, y: point.y } : null; },
    diagnostics() { return { version: Phaser.VERSION, layout, mode: displayClock.mode, displayTime, events: journal.history, decorationOmitted: journal.omitted, textures: phaser.textures.getTextureKeys().length, coreTick: current.tick, scene: (phaser.scene.getScenes(true)[0] as FarmScene | undefined)?.inspect() }; },
    destroy() { if (destroyed) return; destroyed = true; ready = false; observer.disconnect(); window.removeEventListener('resize', resize); journal.begin('destroyed', 0); firstFrame(false); phaser.destroy(true);
      if (page?.style.getPropertyValue('--game-scenery-image') === ownedScenery) page.style.removeProperty('--game-scenery-image');
      if (page?.style.getPropertyValue('--r3-page-scenery-image') === ownedPageImage) page.style.removeProperty('--r3-page-scenery-image');
      if (page?.style.getPropertyValue('--r3-title-image') === ownedTitleImage) page.style.removeProperty('--r3-title-image');
      if (page?.style.getPropertyValue('--r3-page-scenery-top') === ownedSceneryTop) page.style.removeProperty('--r3-page-scenery-top');
      if (page?.style.getPropertyValue('--r3-page-scenery-size') === ownedScenerySize) page.style.removeProperty('--r3-page-scenery-size');
      delete parent.dataset.candidateManifest;
      releaseAssets(atlases); }
  };
}
