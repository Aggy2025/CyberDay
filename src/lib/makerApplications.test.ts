import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMakerUseCaseForClass,
  getMakerUseCaseForScenario,
  MAKERLAB_USE_CASES,
} from './makerApplications';

test('MAKERLAB_USE_CASES covers all 4 physical sensor domains with non-empty MakerLab guides', () => {
  const keys = Object.keys(MAKERLAB_USE_CASES) as Array<keyof typeof MAKERLAB_USE_CASES>;
  assert.deepEqual(keys.sort(), ['imu', 'light', 'mfa', 'thermal']);

  for (const key of keys) {
    const item = MAKERLAB_USE_CASES[key];
    assert.ok(item.realWorldTitle.length > 10);
    assert.ok(item.microcontrollerRole.includes('ESP32'));
    assert.ok(item.edgeAiRole.length > 20);
    assert.ok(item.makerLabProject.length > 20);
  }
});

test('scenario and AI class helpers map consistently to MakerLab prototypes', () => {
  assert.equal(getMakerUseCaseForScenario('optical_breach').id, 'light');
  assert.equal(getMakerUseCaseForScenario('tampering').id, 'imu');
  assert.equal(getMakerUseCaseForScenario('thermal_attack').id, 'thermal');
  assert.equal(getMakerUseCaseForScenario('brute_force').id, 'mfa');

  assert.equal(getMakerUseCaseForClass('optical_breach').id, 'light');
  assert.equal(getMakerUseCaseForClass('tampering').id, 'imu');
  assert.equal(getMakerUseCaseForClass('side_channel').id, 'thermal');
});
