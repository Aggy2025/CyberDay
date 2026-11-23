import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOpticalLessonMetrics } from './opticalEducation';

const THRESHOLDS = {
  minLightCounts: 40,
  maxLightCounts: 620,
};

test('computeOpticalLessonMetrics models inverse LDR resistance and voltage divider behavior', () => {
  const dark = computeOpticalLessonMetrics(10, THRESHOLDS);
  const mid = computeOpticalLessonMetrics(300, THRESHOLDS);
  const bright = computeOpticalLessonMetrics(900, THRESHOLDS);

  assert.ok(dark.ldrResistanceKOhm > mid.ldrResistanceKOhm);
  assert.ok(mid.ldrResistanceKOhm > bright.ldrResistanceKOhm);
  assert.ok(dark.dividerVoltageV < mid.dividerVoltageV);
  assert.ok(mid.dividerVoltageV < bright.dividerVoltageV);
});

test('computeOpticalLessonMetrics classifies blinding, safe, and intrusion zones accurately', () => {
  const blinding = computeOpticalLessonMetrics(15, THRESHOLDS);
  assert.equal(blinding.zone, 'blinding');
  assert.equal(blinding.zoneLabel, 'Ceguera / Bloqueo');

  const safe = computeOpticalLessonMetrics(280, THRESHOLDS);
  assert.equal(safe.zone, 'safe');
  assert.equal(safe.zoneLabel, 'Sellado (Nominal)');

  const intrusion = computeOpticalLessonMetrics(820, THRESHOLDS);
  assert.equal(intrusion.zone, 'intrusion');
  assert.equal(intrusion.zoneLabel, 'Intrusión Óptica');
});

test('computeOpticalLessonMetrics clamps out-of-range light counts safely', () => {
  const low = computeOpticalLessonMetrics(-50, THRESHOLDS);
  const high = computeOpticalLessonMetrics(2400, THRESHOLDS);
  assert.equal(low.lightCounts, 0);
  assert.equal(high.lightCounts, 1000);
});
