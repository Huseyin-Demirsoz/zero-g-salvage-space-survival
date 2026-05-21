import { formatTime } from '../utils/math.js';

function barHTML(id, label) {
  return `
    <div class="hud-bar-row">
      <div class="hud-bar-label">${label}</div>
      <div class="hud-bar-track">
        <div id="${id}" class="hud-bar-fill"></div>
      </div>
      <div id="${id}-value" class="hud-bar-value">100</div>
    </div>
  `;
}

export class HUD {
  constructor(gameState, onRestart) {
    this.gameState = gameState;
    this.onRestart = onRestart;
    this.player = null;

    this.root = document.createElement('div');
    document.getElementById('sidebysidefacilitator').appendChild(this.root);
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-panel hud-left" style ="float: left;">
        <h1>ZERO-G SALVAGE</h1>
        ${barHTML('hunger-bar', 'Hunger')}
        ${barHTML('thirst-bar', 'Thirst')}
        ${barHTML('oxygen-bar', 'Oxygen')}
        ${barHTML('fuel-bar', 'Extinguisher')}
        <div class="hud-stat"><span>Survival Time</span><strong id="timer">00:00</strong></div>
        <div class="hud-stat"><span>Score</span><strong id="score">0</strong></div>
        <div class="hud-stat"><span>Stored Items</span><strong id="stored">0</strong></div>
        <div class="hud-stat wide"><span>Inventory</span><strong id="inventory">F:0 W:0 O₂:0 Ext:0 Cr:0</strong></div>
        <div class="hud-stat"><span>Scanner</span><strong id="scanner">READY</strong></div>
        <div class="hud-stat"><span>Nearest Supply</span><strong id="nearest">--</strong></div>
        <div class="hud-stat"><span>Velocity</span><strong id="velocity">0.0 m/s</strong></div>
        <div class="hud-stat wide"><span>Held</span><strong id="held">None</strong></div>
      </div>

      <div id="crosshair">+</div>

      <div id="throw-charge-ui">
        <div id="throw-charge-label">THROW POWER</div>
        <div id="throw-charge-track">
          <div id="throw-charge-fill"></div>
        </div>
      </div>

      <div id="warning"></div>
      <div id="pickup-feedback"></div>

      <div class="hud-panel hud-help">
        <strong>Controls</strong><br />
        Click: mouse lock · Mouse: look<br />
        WASD: horizontal/forward thrust<br />
        X: up · Z: down · Alt: boost<br />
        Space/Left Click: extinguisher backward thrust<br />
        E: grab/drop · Hold/Release Left Click: throw<br />
        C: consume held resource · F: flashlight<br />
        R: scanner ping · G: settings panel
      </div>

      <div id="game-over" class="hidden">
        <div class="game-over-card">
          <h2>MISSION FAILED</h2>
          <p id="game-over-reason"></p>
          <button id="restart-button" type="button">Restart Mission</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);

    this.elements = {
      hunger: document.querySelector('#hunger-bar'),
      hungerValue: document.querySelector('#hunger-bar-value'),
      thirst: document.querySelector('#thirst-bar'),
      thirstValue: document.querySelector('#thirst-bar-value'),
      oxygen: document.querySelector('#oxygen-bar'),
      oxygenValue: document.querySelector('#oxygen-bar-value'),
      fuel: document.querySelector('#fuel-bar'),
      fuelValue: document.querySelector('#fuel-bar-value'),
      timer: document.querySelector('#timer'),
      score: document.querySelector('#score'),
      stored: document.querySelector('#stored'),
      inventory: document.querySelector('#inventory'),
      scanner: document.querySelector('#scanner'),
      nearest: document.querySelector('#nearest'),
      velocity: document.querySelector('#velocity'),
      held: document.querySelector('#held'),
      throwChargeUI: document.querySelector('#throw-charge-ui'),
      throwChargeFill: document.querySelector('#throw-charge-fill'),
      warning: document.querySelector('#warning'),
      feedback: document.querySelector('#pickup-feedback'),
      gameOver: document.querySelector('#game-over'),
      gameOverReason: document.querySelector('#game-over-reason'),
      restartButton: document.querySelector('#restart-button')
    };

    this.elements.restartButton.addEventListener('click', () => {
      this.onRestart?.();
    });

    this.feedbackTimer = 0;
  }

  setPlayer(player) {
    this.player = player;
  }

  setBar(element, valueElement, value) {
    const rounded = Math.round(value);
    element.style.width = `${rounded}%`;
    valueElement.textContent = rounded;
  }

  showFeedback(message) {
    this.elements.feedback.textContent = message;
    this.elements.feedback.classList.add('visible');
    this.feedbackTimer = 1.7;
  }

  updatePlayerReadouts() {
    if (!this.player) return;

    const speed = this.player.body.velocity.length();
    this.elements.velocity.textContent = `${speed.toFixed(1)} m/s`;

    if (!this.player.heldItem) {
      this.elements.held.textContent = 'None';
      this.elements.throwChargeUI.classList.remove('visible');
      this.elements.throwChargeFill.style.width = '0%';
      return;
    }

    const chargePercent = Math.round(
      (this.player.throwCharge / this.player.maxThrowCharge) * 100
    );

    this.elements.held.textContent = `${this.player.heldItem.label} · Throw ${chargePercent}%`;

    const isCharging = this.player.throwCharge > 0.03;

    this.elements.throwChargeUI.classList.toggle('visible', isCharging);
    this.elements.throwChargeFill.style.width = `${chargePercent}%`;
  }

  update(delta, scannerCooldown) {
    const state = this.gameState;

    this.setBar(this.elements.hunger, this.elements.hungerValue, state.hunger);
    this.setBar(this.elements.thirst, this.elements.thirstValue, state.thirst);
    this.setBar(this.elements.oxygen, this.elements.oxygenValue, state.oxygen);
    this.setBar(this.elements.fuel, this.elements.fuelValue, state.fuel);

    this.elements.timer.textContent = formatTime(state.time);
    this.elements.score.textContent = state.score;
    this.elements.stored.textContent = state.stored;
    this.elements.inventory.textContent = state.getInventoryText();
    this.elements.scanner.textContent = scannerCooldown <= 0 ? 'READY' : `${scannerCooldown.toFixed(1)}s`;
    this.elements.nearest.textContent = state.nearestSupplyDistance == null
      ? '--'
      : `${state.nearestSupplyDistance.toFixed(1)}m`;

    this.updatePlayerReadouts();

    this.elements.warning.textContent = state.warning;
    this.elements.warning.classList.toggle('visible', Boolean(state.warning));
    document.body.classList.toggle('danger', state.oxygen < 25 || state.warning.includes('Signal') || state.warning.includes('Return'));

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= delta;
      if (this.feedbackTimer <= 0) {
        this.elements.feedback.classList.remove('visible');
      }
    }

    if (state.gameOver) {
      this.elements.gameOver.classList.remove('hidden');
      this.elements.gameOverReason.textContent = `${state.gameOverReason} · Final time: ${formatTime(state.time)} · Score: ${state.score}`;
    } else {
      this.elements.gameOver.classList.add('hidden');
    }
  }
}
