import GUI from 'lil-gui';

export function createSettings() {
  const settings = {
    flashlightBrightness: 4.8,
    grabdistance: 4.2,
    selfFriction: true,
    selfFrictionStrength: 0.986,
    playerSelfFriction: true,
    playerSelfFrictionStrength: 0.992,
    playerThrustForce: 22,
    boostMultiplier: 1.8,
    throwForceMultiplier: 17,
    scannerRange: 38,
    scannerCooldown: 5,
    scannerGlowTime: 2.4,
    safeZoneRadius: 72,
    warningRadius: 48,
    hungerDrain: 1.8,
    thirstDrain: 2.3,
    oxygenDrain: 2.0,
    autoUseStoredItems: true,
    autoUseThreshold: 30
  };

  const gui = new GUI({ title: 'Zero-G Debug Settings' });
  gui.add(settings, 'flashlightBrightness', 0, 10, 0.1).name('Flashlight Brightness');
  gui.add(settings, 'grabdistance', 1, 10, 0.1).name('Grab Distance');
  gui.add(settings, 'selfFriction').name('Item Self Friction');
  gui.add(settings, 'selfFrictionStrength', 0.90, 1.0, 0.001).name('Item Friction Strength');
  gui.add(settings, 'playerSelfFriction').name('Player Self Friction');
  gui.add(settings, 'playerSelfFrictionStrength', 0.94, 1.0, 0.001).name('Player Friction Strength');
  gui.add(settings, 'playerThrustForce', 5, 60, 1).name('Player Thrust');
  gui.add(settings, 'boostMultiplier', 1, 3, 0.1).name('Alt Boost Multiplier');
  gui.add(settings, 'throwForceMultiplier', 5, 40, 1).name('Throw Force');
  gui.add(settings, 'scannerRange', 10, 80, 1).name('Scanner Range');
  gui.add(settings, 'safeZoneRadius', 35, 130, 1).name('Safe Zone Radius');
  gui.add(settings, 'autoUseStoredItems').name('Auto-use Stored Items');
  gui.add(settings, 'autoUseThreshold', 5, 65, 1).name('Auto-use Threshold');

  let visible = false;
  gui.hide();

  function toggleGui() {
    visible = !visible;
    if (visible) gui.show();
    else gui.hide();
    return visible;
  }

  return { settings, gui, toggleGui };
}
