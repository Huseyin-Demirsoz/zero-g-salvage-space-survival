import * as THREE from 'three';
import { createScene } from '../scene/createScene.js';
import { createLights } from '../scene/createLights.js';
import { createEnvironment } from '../scene/createEnvironment.js';
import { createSpaceship } from '../scene/createSpaceship.js';
import { createStorageZone } from '../scene/createStorageZone.js';
import { createPhysicsWorld } from '../physics/createPhysicsWorld.js';
import { createSettings } from './Settings.js';
import { GameState } from './GameState.js';
import { Input } from './Input.js';
import { PlayerController } from '../player/PlayerController.js';
import { FlashlightController } from '../player/FlashlightController.js';
import { ItemManager } from '../items/ItemManager.js';
import { ScannerSystem } from '../systems/ScannerSystem.js';
import { BoundarySystem } from '../systems/BoundarySystem.js';
import { StorageSystem } from '../systems/StorageSystem.js';
import { SurvivalSystem } from '../systems/SurvivalSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { HUD } from '../ui/HUD.js';
import { FIXED_TIME_STEP, MAX_DELTA } from '../utils/constants.js';

export class Game {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.accumulator = 0;
    this.wasGameOver = false;

    const { settings, toggleGui } = createSettings();
    this.settings = settings;
    this.toggleGui = toggleGui;

    this.gameState = new GameState();
    this.world = createPhysicsWorld();

    const { scene, camera, renderer } = createScene(container);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    createLights(scene);
    createEnvironment(scene);
    this.spaceship = createSpaceship(scene, this.world);
    this.storageZone = createStorageZone(scene);

    this.input = new Input(renderer.domElement);
    this.particles = new ParticleSystem(scene);
    this.player = new PlayerController(camera, this.world, this.input, this.gameState, settings, this.particles);
    this.flashlight = new FlashlightController(scene, camera, settings);
    this.hud = new HUD(this.gameState, () => this.restart());
    this.hud.setPlayer(this.player);

    this.itemManager = new ItemManager(scene, this.world, this.gameState, settings);
    this.itemManager.spawnInitialItems();

    this.scanner = new ScannerSystem(this.itemManager, this.gameState, settings, this.storageZone);
    this.boundary = new BoundarySystem(this.gameState, settings);
    this.storage = new StorageSystem(this.itemManager, this.gameState, this.storageZone);
    this.survival = new SurvivalSystem(this.gameState, settings);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.update());
  }

  restart() {
    this.gameState.restart();
    this.player.reset();
    this.itemManager.reset();
    this.scanner.reset();
    this.accumulator = 0;
    this.clock.getDelta();
    this.wasGameOver = false;
    this.hud.showFeedback('Mission restarted');
  }

  handleInteractions() {
    if (this.input.wasPressed('KeyG')) {
      const visible = this.toggleGui();
      this.hud.showFeedback(visible ? 'Settings panel opened' : 'Settings panel hidden');
    }

    if (this.gameState.gameOver) return;

    if (this.input.wasPressed('KeyF')) {
      this.flashlight.toggle();
      this.hud.showFeedback(this.flashlight.enabled ? 'Flashlight ON' : 'Flashlight OFF');
    }

    if (this.input.wasPressed('KeyR')) {
      const didPing = this.scanner.tryPing(this.camera.position);
      if (didPing) this.hud.showFeedback('Scanner ping sent');
      else this.hud.showFeedback('Scanner cooling down');
    }

    if (this.input.wasPressed('KeyE')) {
      if (this.player.heldItem) {
        const dropped = this.player.dropHeldItem();
        this.hud.showFeedback(`Dropped ${dropped.label}`);
      } else {
        const nearest = this.itemManager.findNearestItem(this.camera.position);
        if (nearest) {
          this.player.setHeldItem(nearest);
          this.hud.showFeedback(`Holding ${nearest.label}`);
        } else {
          this.hud.showFeedback('No item nearby');
        }
      }
    }

    if (this.input.wasPressed('KeyC') && this.player.heldItem) {
      const held = this.player.heldItem;
      const consumed = this.itemManager.consumeItem(held);
      if (consumed) {
        this.player.heldItem = null;
        this.hud.showFeedback(`Consumed ${held.label}`);
      } else {
        this.hud.showFeedback(`${held.label} cannot be consumed`);
      }
    }
  }

  fixedPhysicsStep(delta) {
    this.world.step(FIXED_TIME_STEP, delta, 3);
  }

  updateGameOverState() {
    if (this.gameState.gameOver && !this.wasGameOver) {
      this.input.unlockPointer();
      this.wasGameOver = true;
    }
  }

  update() {
    const delta = Math.min(this.clock.getDelta(), MAX_DELTA);

    this.handleInteractions();
    this.player.update(delta);
    this.flashlight.update();

    const autoUseMessage = this.survival.update(delta);
    if (autoUseMessage) this.hud.showFeedback(autoUseMessage);

    this.boundary.update(this.camera.position);
    this.itemManager.update(delta, this.camera.position);
    this.storage.update();
    this.scanner.update(delta);
    this.particles.update(delta);
    this.updateGameOverState();

    this.accumulator += delta;
    while (this.accumulator >= FIXED_TIME_STEP) {
      this.fixedPhysicsStep(FIXED_TIME_STEP);
      this.accumulator -= FIXED_TIME_STEP;
    }

    this.hud.update(delta, this.scanner.cooldown);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
