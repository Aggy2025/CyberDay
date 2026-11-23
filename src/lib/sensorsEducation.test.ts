import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeImuLessonMetrics,
  computeMfaLessonMetrics,
  computeThermalLessonMetrics,
} from './sensorsEducation';

const THRESHOLDS = {
  maxAccelDeltaG: 0.28,
  maxGyroDps: 45,
  maxTempC: 33.5,
  maxButtonBurst: 6,
};

test('computeImuLessonMetrics separates rest, single-axis breach, and combined tampering', () => {
  const rest = computeImuLessonMetrics(0.02, 2, THRESHOLDS);
  assert.equal(rest.status, 'nominal');

  const gyroOnly = computeImuLessonMetrics(0.05, 85, THRESHOLDS);
  assert.equal(gyroOnly.status, 'critical');
  assert.equal(gyroOnly.statusLabel, 'Rotación / Inclinación Anómala');

  const both = computeImuLessonMetrics(0.65, 95, THRESHOLDS);
  assert.equal(both.status, 'critical');
  assert.equal(both.statusLabel, 'Sabotaje Físico Crítico');
});

test('computeThermalLessonMetrics flags overheating and condensation risk', () => {
  const ok = computeThermalLessonMetrics(24.5, 50, THRESHOLDS);
  assert.equal(ok.status, 'nominal');
  assert.equal(ok.condensationRisk, false);

  const humid = computeThermalLessonMetrics(25.0, 84, THRESHOLDS);
  assert.equal(humid.status, 'warning');
  assert.equal(humid.condensationRisk, true);

  const hot = computeThermalLessonMetrics(37.2, 42, THRESHOLDS);
  assert.equal(hot.status, 'critical');
});

test('computeMfaLessonMetrics detects physical brute-force bursts', () => {
  const normal = computeMfaLessonMetrics(1, THRESHOLDS);
  assert.equal(normal.status, 'nominal');

  const warn = computeMfaLessonMetrics(4, THRESHOLDS);
  assert.equal(warn.status, 'warning');

  const brute = computeMfaLessonMetrics(6, THRESHOLDS);
  assert.equal(brute.status, 'critical');
  assert.equal(brute.ratioPct, 100);
});
