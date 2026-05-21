import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PLAYER_START } from '../utils/constants.js';
import { cameraForward, cameraRight } from '../utils/math.js';
import { applySelfFriction } from '../physics/syncPhysics.js';

export class PlayerController {
  constructor(camera, world, input, gameState, settings, particleSystem) {
    this.camera = camera;
    this.world = world;
    this.input = input;
    this.gameState = gameState;
    this.settings = settings;
    this.particleSystem = particleSystem;

    this.pitch = 0;
    this.yaw = Math.PI;
    this.mouseSensitivity = 0.0022;
    this.throwCharge = 0;
    this.maxThrowCharge = 2.2;
    this.heldItem = null;

    this.body = new CANNON.Body({
      mass: 4,
      shape: new CANNON.Sphere(0.8),
      position: new CANNON.Vec3(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z),
      linearDamping: 0,
      angularDamping: 0
    });
    this.world.addBody(this.body);
  }

  reset() {
    this.body.position.set(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.camera.position.set(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
    this.pitch = 0;
    this.yaw = Math.PI;
    this.heldItem = null;
    this.throwCharge = 0;
  }

  setHeldItem(item) {
    this.heldItem = item;
    if (!item) return;
    item.held = true;
    item.body.velocity.set(0, 0, 0);
    item.body.angularVelocity.set(0, 0, 0);
    item.body.collisionResponse = false;
  }

  dropHeldItem() {
    if (!this.heldItem) return null;
    const item = this.heldItem;
    item.held = false;
    item.body.collisionResponse = true;
    this.heldItem = null;
    this.throwCharge = 0;
    return item;
  }

  throwHeldItem() {
    if (!this.heldItem) return null;

    const item = this.dropHeldItem();
    const forward = cameraForward(this.camera);
    const charge = Math.max(0.35, this.throwCharge);
    const force = this.settings.throwForceMultiplier * charge;

    item.body.position.set(
      this.camera.position.x + forward.x * 2.2,
      this.camera.position.y + forward.y * 2.2,
      this.camera.position.z + forward.z * 2.2
    );

    // cannon-es impulse uses mass, so heavy/large items accelerate less than small items.
    item.body.applyImpulse(
      new CANNON.Vec3(forward.x * force, forward.y * force, forward.z * force),
      item.body.position
    );

    this.throwCharge = 0;
    return item;
  }

  applyThrust(direction, delta, multiplier = 1) {
    if (this.gameState.fuel <= 0) return;

    const fuelCost = 10 * multiplier * delta;
    if (!this.gameState.useFuel(fuelCost)) return;

    const force = this.settings.playerThrustForce * multiplier;
    this.body.applyForce(
      new CANNON.Vec3(direction.x * force, direction.y * force, direction.z * force),
      this.body.position
    );

    this.particleSystem?.emitSpray(this.camera.position, direction.clone().multiplyScalar(-1));
  }

  updateLook() {
    this.yaw -= this.input.mouseDelta.x * this.mouseSensitivity;
    this.pitch -= this.input.mouseDelta.y * this.mouseSensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  updateMovement(delta) {
    if (this.gameState.gameOver) return;

    const forward = cameraForward(this.camera);
    const right = cameraRight(this.camera);
    const up = new THREE.Vector3(0, 1, 0);
    const thrust = new THREE.Vector3();

    if (this.input.isDown('KeyW')) thrust.add(forward);
    if (this.input.isDown('KeyS')) thrust.sub(forward);
    if (this.input.isDown('KeyD')) thrust.add(right);
    if (this.input.isDown('KeyA')) thrust.sub(right);

    // Added vertical zero-g thrust: Shift goes up, Ctrl goes down.
    // Vertical zero-g thrust: E goes up, Q goes down.
    // Firstly we use Ctrl (down) and Shift (up) but i changed that because Ctrl + W closes the browser tab.
    if (this.input.isDown('KeyX')) thrust.add(up);
    if (this.input.isDown('KeyZ')) thrust.sub(up);

    if (thrust.lengthSq() > 0) {
      thrust.normalize();
      const boost = this.input.isDown('AltLeft') || this.input.isDown('AltRight')
        ? this.settings.boostMultiplier
        : 0.8;
      this.applyThrust(thrust, delta, boost);
    }

    // Main extinguisher spray: spray forward, move backward.
    if (!this.heldItem && (this.input.mouseDown || this.input.isDown('Space'))) {
      this.applyThrust(forward.clone().multiplyScalar(-1), delta, 1.15);
    }
  }

  updateHeldItem(delta) {
    if (!this.heldItem) return;

    const forward = cameraForward(this.camera);
    const holdPosition = this.camera.position.clone().add(forward.multiplyScalar(2.1));

    this.heldItem.body.position.set(holdPosition.x, holdPosition.y - 0.15, holdPosition.z);
    this.heldItem.body.velocity.set(0, 0, 0);
    this.heldItem.mesh.position.copy(this.heldItem.body.position);
    this.heldItem.mesh.quaternion.copy(this.camera.quaternion);

    if (this.input.mouseDown) {
      this.throwCharge = Math.min(this.maxThrowCharge, this.throwCharge + delta);
    }

    if (this.input.mouseJustUp) {
      this.throwHeldItem();
    }
  }

  updatePlayerSelfFriction(delta) {
    if (!this.settings.playerSelfFriction || this.gameState.gameOver) return;
    applySelfFriction(this.body, this.settings.playerSelfFrictionStrength, delta);
  }

  update(delta) {
    this.updateLook();
    this.updateMovement(delta);
    this.updateHeldItem(delta);
    this.updatePlayerSelfFriction(delta);

    this.camera.position.copy(this.body.position);
  }
}
