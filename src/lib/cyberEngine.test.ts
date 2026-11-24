import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTelemetryWindow,
  computeThreatTrendPoint,
  createBaselineCyberDataset,
  DEFAULT_THRESHOLDS,
  evaluateSecurityAlerts,
  exportAlertsToCsv,
  exportAlertsToJson,
  exportAuditToCsv,
  extractFeatureVector,
  generateCircuitPythonClassifier,
  generateSimulatedTelemetry,
  resolveDataOrigin,
} from './cyberEngine';
import type { AuditRow, TelemetryPacket } from './types';

test('generateSimulatedTelemetry produces distinct physical attack signatures', () => {
  const normal = generateSimulatedTelemetry('normal', 10, 1000);
  const tamper = generateSimulatedTelemetry('tampering', 10, 1000);
  const optical = generateSimulatedTelemetry('optical_breach', 2, 1000);
  const thermal = generateSimulatedTelemetry('thermal_attack', 60, 1000);

  assert.ok(Math.abs(normal.az - 1.0) < 0.05);
  assert.ok(Math.abs(tamper.gx) > 15 || Math.abs(tamper.gy) > 15);
  assert.ok(optical.l > 650);
  assert.ok(thermal.t > 33.5);
});

test('evaluateSecurityAlerts triggers tampering, optical, thermal, and brute-force alerts', () => {
  const tamperPacket: TelemetryPacket = {
    t: 25.0,
    h: 50,
    l: 300,
    ax: 0.9,
    ay: 0.4,
    az: 1.5,
    gx: 80,
    gy: 10,
    gz: 5,
    ba: 0,
    bb: 0,
    sim: 0,
    ts: 5000,
  };
  const alertsTamper = evaluateSecurityAlerts(tamperPacket, DEFAULT_THRESHOLDS, 0);
  assert.equal(alertsTamper.some((a) => a.category === 'tampering'), true);

  const opticalPacket: TelemetryPacket = { ...tamperPacket, ax: 0, ay: 0, az: 1, gx: 0, gy: 0, gz: 0, l: 820 };
  const alertsOptical = evaluateSecurityAlerts(opticalPacket, DEFAULT_THRESHOLDS, 0);
  assert.equal(alertsOptical.some((a) => a.category === 'optical'), true);

  const bruteAlerts = evaluateSecurityAlerts(
    { ...opticalPacket, l: 300, t: 36.2 },
    DEFAULT_THRESHOLDS,
    6,
  );
  assert.equal(bruteAlerts.some((a) => a.category === 'thermal'), true);
  assert.equal(bruteAlerts.some((a) => a.category === 'access'), true);
});

test('extractFeatureVector returns 16 finite numeric features', () => {
  const window: TelemetryPacket[] = [];
  for (let i = 0; i < 20; i++) {
    window.push(generateSimulatedTelemetry('normal', i, 1000 + i * 40));
  }
  const vec = extractFeatureVector(window);
  assert.equal(vec.length, 16);
  assert.equal(vec.every((n) => Number.isFinite(n)), true);
});

test('classifyTelemetryWindow accurately separates normal, tampering, optical_breach, and side_channel', () => {
  const dataset = createBaselineCyberDataset();

  const buildWin = (scenario: Parameters<typeof generateSimulatedTelemetry>[0]) =>
    Array.from({ length: 25 }, (_, i) => generateSimulatedTelemetry(scenario, i + 5, 2000 + i * 40));

  const normalPred = classifyTelemetryWindow(buildWin('normal'), dataset);
  assert.ok(normalPred);
  assert.equal(normalPred.predictedClass, 'normal');
  assert.equal(normalPred.isAnomaly, false);

  const tamperPred = classifyTelemetryWindow(buildWin('tampering'), dataset);
  assert.ok(tamperPred);
  assert.equal(tamperPred.predictedClass, 'tampering');
  assert.equal(tamperPred.isAnomaly, true);

  const opticalPred = classifyTelemetryWindow(buildWin('optical_breach'), dataset);
  assert.ok(opticalPred);
  assert.equal(opticalPred.predictedClass, 'optical_breach');
  assert.equal(opticalPred.isAnomaly, true);

  const thermalPred = classifyTelemetryWindow(buildWin('thermal_attack'), dataset);
  assert.ok(thermalPred);
  assert.equal(thermalPred.predictedClass, 'side_channel');
  assert.equal(thermalPred.isAnomaly, true);
});

test('resolveDataOrigin and exportAuditToCsv preserve IdeaSense data transparency', () => {
  const realPkt = generateSimulatedTelemetry('normal', 1, 1000);
  assert.equal(resolveDataOrigin('demo', realPkt), 'DEMO_SIMULADO');
  assert.equal(resolveDataOrigin('ble', { ...realPkt, sim: 0 }), 'REAL_BLE');
  assert.equal(resolveDataOrigin('ble', { ...realPkt, sim: 2 }), 'FIRMWARE_SIMULADO');

  const rows: AuditRow[] = [
    {
      isoTime: '2026-11-18T14:30:00.000Z',
      elapsedSec: 1.0,
      origenDatos: 'DEMO_SIMULADO',
      t: 25.4,
      h: 54.0,
      l: 290,
      ax: 0.01,
      ay: -0.01,
      az: 1.0,
      gx: 0.5,
      gy: 0.2,
      gz: -0.1,
      ba: 0,
      bb: 0,
      predictedClass: 'normal',
      anomalyDistance: 0.042,
      note: 'Prueba, "rack cerrado"',
    },
  ];
  const csv = exportAuditToCsv(rows);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('origen_datos'));
  assert.ok(lines[1].includes('DEMO_SIMULADO'));
  assert.ok(lines[1].includes('"Prueba, ""rack cerrado"""'));
});

test('generateCircuitPythonClassifier generates valid Python model definition', () => {
  const dataset = createBaselineCyberDataset();
  const py = generateCircuitPythonClassifier(dataset);
  assert.ok(py.includes('def classify_knn'));
  assert.ok(py.includes('SAMPLES ='));
  assert.ok(py.includes('optical_breach'));
});

test('computeThreatTrendPoint maps normal vs attack AI predictions into 0-100 threat score', () => {
  const normalPt = computeThreatTrendPoint(
    {
      predictedClass: 'normal',
      confidence: 100,
      minDistance: 0.05,
      isAnomaly: false,
      zScoreMax: 0.4,
      neighborsCount: 3,
    },
    1760000000000,
  );
  assert.ok(normalPt.threatScore <= 25);
  assert.equal(normalPt.predictedLabel, 'Operación Normal');

  const attackPt = computeThreatTrendPoint(
    {
      predictedClass: 'tampering',
      confidence: 98,
      minDistance: 0.04,
      isAnomaly: true,
      zScoreMax: 12.5,
      neighborsCount: 3,
    },
    1760000005000,
  );
  assert.ok(attackPt.threatScore >= 85 && attackPt.threatScore <= 100);
  assert.equal(attackPt.predictedLabel, 'Sabotaje Físico (Tampering)');
});

test('exportAlertsToCsv and exportAlertsToJson serialize SOC alerts with proper escaping', () => {
  const sampleAlerts = [
    {
      id: 'al-1',
      ts: 1700000000000,
      severity: 'critical' as const,
      category: 'tampering' as const,
      title: 'Manipulación, "física" detectada',
      detail: 'Δ|a|=0.65 g, |ω|=92.0 dps',
      vectorTag: 'Physical Tampering · T1200',
    },
  ];

  const csv = exportAlertsToCsv(sampleAlerts);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('vector_ataque'));
  assert.ok(lines[1].includes('"Manipulación, ""física"" detectada"'));
  assert.ok(lines[1].includes('2023-11-14T22:13:20.000Z'));

  const jsonStr = exportAlertsToJson(sampleAlerts, '2026-11-20T21:15:00.000Z');
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.total_alertas, 1);
  assert.equal(parsed.exportado_en, '2026-11-20T21:15:00.000Z');
  assert.equal(parsed.alertas[0].categoria, 'tampering');
  assert.equal(parsed.alertas[0].vector_ataque, 'Physical Tampering · T1200');
});
