import type {
  AuditRow,
  CyberScenario,
  DataOriginLabel,
  HeatmapGroupingMode,
  HeatmapMatrix,
  KnnPrediction,
  KnnSample,
  SecurityAlert,
  SecurityClassId,
  SecurityThresholds,
  TelemetryPacket,
} from './types';

export const DEFAULT_THRESHOLDS: SecurityThresholds = {
  maxAccelDeltaG: 0.28,
  maxGyroDps: 45,
  minLightCounts: 40,
  maxLightCounts: 620,
  maxTempC: 33.5,
  maxButtonBurst: 5,
};

export const SECURITY_CLASS_META: Record<
  SecurityClassId,
  { name: string; description: string; severity: 'nominal' | 'warning' | 'critical' }
> = {
  normal: {
    name: 'Operación Normal',
    description: 'Nodo físico estable en reposo, iluminación constante y firma térmica nominal.',
    severity: 'nominal',
  },
  tampering: {
    name: 'Sabotaje Físico (Tampering)',
    description: 'Vibración, inclinación o traslado no autorizado detectado por el IMU.',
    severity: 'critical',
  },
  optical_breach: {
    name: 'Intrusión Óptica / Apertura',
    description: 'Cambio abrupto de flujo lumínico por apertura de gabinete o inyección láser.',
    severity: 'warning',
  },
  side_channel: {
    name: 'Canal Lateral / Micro-oscilación',
    description: 'Patrón anómalo combinado de micro-vibración electromecánica y deriva térmica.',
    severity: 'critical',
  },
};

export const SCENARIO_META: Record<
  CyberScenario,
  { label: string; shortDesc: string; expectedClass: SecurityClassId }
> = {
  normal: {
    label: 'Operación Normal',
    shortDesc: 'Rack cerrado, sensores estables sin intrusión.',
    expectedClass: 'normal',
  },
  tampering: {
    label: 'Sabotaje Físico (Tampering)',
    shortDesc: 'Manipulación, golpes o movimiento del chasis.',
    expectedClass: 'tampering',
  },
  optical_breach: {
    label: 'Intrusión Óptica',
    shortDesc: 'Apertura de carcasa o canal encubierto con luz.',
    expectedClass: 'optical_breach',
  },
  thermal_attack: {
    label: 'Anomalía Térmica',
    shortDesc: 'Sobrecalentamiento por sobrecarga o ataque HVAC.',
    expectedClass: 'side_channel',
  },
  brute_force: {
    label: 'Fuerza Bruta Física',
    shortDesc: 'Ráfaga rápida de pulsaciones en botones A/B.',
    expectedClass: 'tampering',
  },
};

function pseudoNoise(step: number, salt: number): number {
  const x = Math.sin(step * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
}

export function generateSimulatedTelemetry(
  scenario: CyberScenario,
  tick: number,
  ts: number = Date.now(),
): TelemetryPacket {
  const n1 = pseudoNoise(tick, 1);
  const n2 = pseudoNoise(tick, 2);
  const n3 = pseudoNoise(tick, 3);
  const n4 = pseudoNoise(tick, 4);

  // Baseline nominal values
  let t = 25.4 + Math.sin(tick * 0.03) * 0.25 + n1 * 0.08;
  let h = 54.0 + Math.cos(tick * 0.025) * 0.6 + n2 * 0.2;
  let l = 290 + Math.sin(tick * 0.05) * 14 + n3 * 6;
  let ax = n1 * 0.015;
  let ay = n2 * 0.015;
  let az = 1.0 + n3 * 0.012;
  let gx = n1 * 1.1;
  let gy = n2 * 1.1;
  let gz = n3 * 0.9;
  let ba = 0;
  let bb = 0;

  if (scenario === 'tampering') {
    const wave = Math.sin(tick * 0.95);
    const impact = Math.cos(tick * 1.45);
    ax = wave * 0.62 + n1 * 0.18;
    ay = impact * 0.54 + n2 * 0.16;
    az = 0.85 + Math.sin(tick * 1.2) * 0.45 + n3 * 0.12;
    gx = wave * 78 + n1 * 22;
    gy = impact * 64 + n2 * 19;
    gz = Math.sin(tick * 0.7) * 52 + n3 * 15;
  } else if (scenario === 'optical_breach') {
    // Alternating high-luminance enclosure open + pulsed optical covert channel
    const pulse = tick % 14 < 8 ? 520 : 180;
    l = 320 + pulse + n4 * 35;
    ax += n1 * 0.03;
    gx += n2 * 4.5;
  } else if (scenario === 'thermal_attack') {
    const ramp = Math.min(14.5, (tick % 120) * 0.22 + 8.5);
    t = 26.0 + ramp + n1 * 0.25;
    h = Math.max(24, 52 - ramp * 1.2 + n2 * 0.4);
    // Micro-oscillation from cooling fan stress / side-channel probe
    ax = Math.sin(tick * 2.1) * 0.14 + n1 * 0.05;
    ay = Math.cos(tick * 2.3) * 0.14 + n2 * 0.05;
    gx = Math.sin(tick * 1.9) * 24 + n3 * 6;
  } else if (scenario === 'brute_force') {
    // Rapid alternating physical A / B presses
    ba = tick % 4 === 0 || tick % 4 === 1 ? 1 : 0;
    bb = tick % 6 === 2 || tick % 6 === 3 ? 1 : 0;
    ax = (ba || bb ? 0.19 : 0.04) * n1;
    az = 1.0 + (ba || bb ? -0.14 : 0.02) + n3 * 0.05;
    gx = (ba || bb ? 28 : 4) * n2;
  }

  return {
    t: Number(t.toFixed(1)),
    h: Number(h.toFixed(1)),
    l: Math.max(0, Math.round(l)),
    ax: Number(ax.toFixed(3)),
    ay: Number(ay.toFixed(3)),
    az: Number(az.toFixed(3)),
    gx: Number(gx.toFixed(1)),
    gy: Number(gy.toFixed(1)),
    gz: Number(gz.toFixed(1)),
    ba,
    bb,
    sim: 0,
    ts,
  };
}

export function computeAccelMagnitude(p: Pick<TelemetryPacket, 'ax' | 'ay' | 'az'>): number {
  return Math.sqrt(p.ax * p.ax + p.ay * p.ay + p.az * p.az);
}

export function computeGyroMagnitude(p: Pick<TelemetryPacket, 'gx' | 'gy' | 'gz'>): number {
  return Math.sqrt(p.gx * p.gx + p.gy * p.gy + p.gz * p.gz);
}

export function evaluateSecurityAlerts(
  packet: TelemetryPacket,
  thresholds: SecurityThresholds,
  recentButtonTransitions: number,
  nowTs: number = packet.ts,
): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  const accelMag = computeAccelMagnitude(packet);
  const accelDelta = Math.abs(accelMag - 1.0);
  const gyroMag = computeGyroMagnitude(packet);

  if (accelDelta > thresholds.maxAccelDeltaG || gyroMag > thresholds.maxGyroDps) {
    alerts.push({
      id: `tamper-${nowTs}`,
      ts: nowTs,
      severity: 'critical',
      category: 'tampering',
      title: 'Manipulación física del nodo detectada',
      detail: `Δ|a|=${accelDelta.toFixed(2)} g (umbral ${thresholds.maxAccelDeltaG} g), |ω|=${gyroMag.toFixed(1)} dps.`,
      vectorTag: 'Physical Tampering · T1200 / Hardware Access',
    });
  }

  if (packet.l > thresholds.maxLightCounts) {
    alerts.push({
      id: `light-high-${nowTs}`,
      ts: nowTs,
      severity: 'warning',
      category: 'optical',
      title: 'Exposición óptica / posible apertura de gabinete',
      detail: `Sensor LTR-303 registró ${packet.l} cuentas (límite máx. ${thresholds.maxLightCounts}).`,
      vectorTag: 'Enclosure Breach / Optical Injection',
    });
  } else if (packet.l < thresholds.minLightCounts) {
    alerts.push({
      id: `light-low-${nowTs}`,
      ts: nowTs,
      severity: 'warning',
      category: 'optical',
      title: 'Obstrucción del sensor óptico',
      detail: `Sensor LTR-303 cayó a ${packet.l} cuentas (mínimo ${thresholds.minLightCounts}).`,
      vectorTag: 'Sensor Spoofing / Blinding',
    });
  }

  if (packet.t > thresholds.maxTempC) {
    alerts.push({
      id: `thermal-${nowTs}`,
      ts: nowTs,
      severity: 'critical',
      category: 'thermal',
      title: 'Anomalía térmica en hardware',
      detail: `Temperatura SHT30 en ${packet.t.toFixed(1)} °C supera umbral (${thresholds.maxTempC} °C).`,
      vectorTag: 'Thermal Side-Channel / Overheating',
    });
  }

  if (recentButtonTransitions >= thresholds.maxButtonBurst) {
    alerts.push({
      id: `brute-${nowTs}`,
      ts: nowTs,
      severity: 'critical',
      category: 'access',
      title: 'Ráfaga anómala de autenticación física (A/B)',
      detail: `${recentButtonTransitions} pulsaciones detectadas en ventana de 3 s.`,
      vectorTag: 'Physical Brute Force · MFA Tamper',
    });
  }

  return alerts;
}

function meanAndStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Extracts a 16-element feature vector from a window of TelemetryPackets:
 * [mean(ax,ay,az,gx,gy,gz,l_scaled,t_scaled), std(ax,ay,az,gx,gy,gz,l_scaled,t_scaled)]
 * Light is scaled (/1000) and Temp (/50) so Euclidean distances are balanced across modalities.
 */
export function extractFeatureVector(windowPackets: TelemetryPacket[]): number[] {
  const ax = meanAndStd(windowPackets.map((p) => p.ax));
  const ay = meanAndStd(windowPackets.map((p) => p.ay));
  const az = meanAndStd(windowPackets.map((p) => p.az));
  const gx = meanAndStd(windowPackets.map((p) => p.gx / 100));
  const gy = meanAndStd(windowPackets.map((p) => p.gy / 100));
  const gz = meanAndStd(windowPackets.map((p) => p.gz / 100));
  const l = meanAndStd(windowPackets.map((p) => p.l / 1000));
  const t = meanAndStd(windowPackets.map((p) => p.t / 50));

  return [
    Number(ax.mean.toFixed(4)),
    Number(ay.mean.toFixed(4)),
    Number(az.mean.toFixed(4)),
    Number(gx.mean.toFixed(4)),
    Number(gy.mean.toFixed(4)),
    Number(gz.mean.toFixed(4)),
    Number(l.mean.toFixed(4)),
    Number(t.mean.toFixed(4)),
    Number(ax.std.toFixed(4)),
    Number(ay.std.toFixed(4)),
    Number(az.std.toFixed(4)),
    Number(gx.std.toFixed(4)),
    Number(gy.std.toFixed(4)),
    Number(gz.std.toFixed(4)),
    Number(l.std.toFixed(4)),
    Number(t.std.toFixed(4)),
  ];
}

export function euclideanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function classifyTelemetryWindow(
  windowPackets: TelemetryPacket[],
  dataset: KnnSample[],
  k: number = 3,
  anomalyDistanceThreshold: number = 0.55,
): KnnPrediction | null {
  if (windowPackets.length < 3 || dataset.length === 0) {
    return null;
  }

  const query = extractFeatureVector(windowPackets);
  const scored = dataset
    .map((sample) => ({
      label: sample.label,
      dist: euclideanDistance(query, sample.features),
    }))
    .sort((a, b) => a.dist - b.dist);

  const effectiveK = Math.min(k, scored.length);
  const topK = scored.slice(0, effectiveK);

  const weightByClass: Record<SecurityClassId, number> = {
    normal: 0,
    tampering: 0,
    optical_breach: 0,
    side_channel: 0,
  };

  let totalWeight = 0;
  for (const item of topK) {
    const w = 1 / (item.dist + 0.0001);
    weightByClass[item.label] += w;
    totalWeight += w;
  }

  let bestClass: SecurityClassId = topK[0].label;
  let bestWeight = -1;
  (Object.keys(weightByClass) as SecurityClassId[]).forEach((cls) => {
    if (weightByClass[cls] > bestWeight) {
      bestWeight = weightByClass[cls];
      bestClass = cls;
    }
  });

  const confidence = totalWeight > 0 ? Math.round((bestWeight / totalWeight) * 100) : 0;
  const minDistance = Number(scored[0].dist.toFixed(3));

  // Compute max Z-score deviation relative to 'normal' samples in dataset
  const normalSamples = dataset.filter((s) => s.label === 'normal');
  let zScoreMax = 0;
  if (normalSamples.length > 0) {
    for (let idx = 0; idx < query.length; idx++) {
      const vals = normalSamples.map((s) => s.features[idx]);
      const { mean, std } = meanAndStd(vals);
      const denom = Math.max(std, 0.03);
      const z = Math.abs(query[idx] - mean) / denom;
      if (z > zScoreMax) zScoreMax = z;
    }
  }

  const isAnomaly = bestClass !== 'normal' || minDistance > anomalyDistanceThreshold;

  return {
    predictedClass: bestClass,
    confidence,
    minDistance,
    isAnomaly,
    zScoreMax: Number(zScoreMax.toFixed(2)),
    neighborsCount: effectiveK,
  };
}

export function createBaselineCyberDataset(): KnnSample[] {
  const scenarios: Array<{ scenario: CyberScenario; label: SecurityClassId }> = [
    { scenario: 'normal', label: 'normal' },
    { scenario: 'tampering', label: 'tampering' },
    { scenario: 'optical_breach', label: 'optical_breach' },
    { scenario: 'thermal_attack', label: 'side_channel' },
  ];

  const samples: KnnSample[] = [];
  const baseTs = 1760000000000;

  scenarios.forEach(({ scenario, label }, sIdx) => {
    for (let rep = 0; rep < 4; rep++) {
      const win: TelemetryPacket[] = [];
      for (let step = 0; step < 30; step++) {
        win.push(generateSimulatedTelemetry(scenario, rep * 37 + step + sIdx * 11, baseTs + step * 40));
      }
      samples.push({
        id: `base-${label}-${rep + 1}`,
        label,
        source: 'baseline',
        createdAt: baseTs + rep * 1000,
        features: extractFeatureVector(win),
      });
    }
  });

  return samples;
}

export function resolveDataOrigin(
  connectionMode: 'disconnected' | 'ble' | 'demo',
  lastPacket: TelemetryPacket | null,
): DataOriginLabel {
  if (connectionMode === 'demo') return 'DEMO_SIMULADO';
  if (connectionMode === 'ble') {
    if (!lastPacket || typeof lastPacket.sim !== 'number') return 'SIN_VERIFICAR';
    return lastPacket.sim === 0 ? 'REAL_BLE' : 'FIRMWARE_SIMULADO';
  }
  return 'SIN_VERIFICAR';
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportAuditToCsv(rows: AuditRow[]): string {
  const headers = [
    'timestamp_iso',
    'tiempo_seg',
    'origen_datos',
    'temp_c',
    'humedad_pct',
    'luz_cuentas',
    'ax_g',
    'ay_g',
    'az_g',
    'gx_dps',
    'gy_dps',
    'gz_dps',
    'btn_a',
    'btn_b',
    'clase_ia_knn',
    'distancia_anomalia',
    'nota_auditoria',
  ];

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.isoTime,
        r.elapsedSec.toFixed(1),
        r.origenDatos,
        r.t.toFixed(1),
        r.h.toFixed(1),
        r.l,
        r.ax.toFixed(3),
        r.ay.toFixed(3),
        r.az.toFixed(3),
        r.gx.toFixed(1),
        r.gy.toFixed(1),
        r.gz.toFixed(1),
        r.ba,
        r.bb,
        r.predictedClass,
        r.anomalyDistance.toFixed(3),
        r.note,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function generateCircuitPythonClassifier(dataset: KnnSample[]): string {
  const serializedSamples = dataset.map((s) => ({
    label: s.label,
    v: s.features.map((n) => Number(n.toFixed(3))),
  }));

  return `"""
Clasificador Edge AI (k-NN) exportado desde IdeaSense Explorer · IA & Ciberseguridad
Universidad CENFOTEC - Modelo entrenado con ${dataset.length} ráfagas de telemetría (16 características).
"""
import math

SAMPLES = ${JSON.stringify(serializedSamples, null, 2)}

def extract_features(window_packets):
    n = len(window_packets)
    if n == 0:
        return [0.0] * 16
    def stats(vals):
        mean = sum(vals) / n
        var = sum((x - mean) ** 2 for x in vals) / n
        return mean, math.sqrt(var)
    ax_m, ax_s = stats([p["ax"] for p in window_packets])
    ay_m, ay_s = stats([p["ay"] for p in window_packets])
    az_m, az_s = stats([p["az"] for p in window_packets])
    gx_m, gx_s = stats([p["gx"] / 100.0 for p in window_packets])
    gy_m, gy_s = stats([p["gy"] / 100.0 for p in window_packets])
    gz_m, gz_s = stats([p["gz"] / 100.0 for p in window_packets])
    l_m, l_s = stats([p["l"] / 1000.0 for p in window_packets])
    t_m, t_s = stats([p["t"] / 50.0 for p in window_packets])
    return [ax_m, ay_m, az_m, gx_m, gy_m, gz_m, l_m, t_m,
            ax_s, ay_s, az_s, gx_s, gy_s, gz_s, l_s, t_s]

def classify_knn(window_packets, k=3):
    q = extract_features(window_packets)
    scored = []
    for sample in SAMPLES:
        dist = math.sqrt(sum((q[i] - sample["v"][i]) ** 2 for i in range(16)))
        scored.append((dist, sample["label"]))
    scored.sort(key=lambda item: item[0])
    votes = {}
    for dist, label in scored[:min(k, len(scored))]:
        votes[label] = votes.get(label, 0.0) + 1.0 / (dist + 0.0001)
    best_label = max(votes, key=votes.get)
    return best_label, scored[0][0]
`;
}

const HEATMAP_CATEGORIES: Record<
  SecurityAlert['category'],
  { typeLabel: string; typeSub: string; locationLabel: string; locationSub: string }
> = {
  tampering: {
    typeLabel: 'Sabotaje Físico',
    typeSub: 'Vibración / Impacto / Traslado',
    locationLabel: 'Chasis · IMU LSM6DS',
    locationSub: 'Bus I2C (0x6A) · Acelerómetro/Giro',
  },
  optical: {
    typeLabel: 'Intrusión Óptica',
    typeSub: 'Apertura / Inyección de Luz',
    locationLabel: 'Gabinete · Sensor LTR-303',
    locationSub: 'Bus I2C (0x29) · Fotodiodo',
  },
  thermal: {
    typeLabel: 'Anomalía Térmica',
    typeSub: 'Sobrecalentamiento / HVAC',
    locationLabel: 'Núcleo PCB · Sensor SHT30',
    locationSub: 'Bus I2C (0x44) · Temp/Humedad',
  },
  access: {
    typeLabel: 'Fuerza Bruta Física',
    typeSub: 'Ráfaga de Autenticación MFA',
    locationLabel: 'Panel Frontal · Botones A/B',
    locationSub: 'GPIO · Entradas Físicas',
  },
};

export function buildAlertHeatmapMatrix(
  alerts: SecurityAlert[],
  mode: HeatmapGroupingMode,
  nowTs: number = Date.now(),
  bucketCount: number = 8,
  bucketWindowMs: number = 15000,
): HeatmapMatrix {
  const safeBuckets = Math.max(2, bucketCount);
  const buckets: string[] = [];
  for (let i = safeBuckets - 1; i >= 0; i--) {
    const secsAgo = Math.round((i * bucketWindowMs) / 1000);
    buckets.push(secsAgo === 0 ? 'Ahora' : `-${secsAgo}s`);
  }

  const order: SecurityAlert['category'][] = ['tampering', 'optical', 'thermal', 'access'];
  const rowMap = new Map<
    SecurityAlert['category'],
    {
      cells: number[];
      total: number;
      criticalCount: number;
      latestTs: number;
      latestDetail: string | null;
    }
  >();

  for (const cat of order) {
    rowMap.set(cat, {
      cells: Array(safeBuckets).fill(0),
      total: 0,
      criticalCount: 0,
      latestTs: -1,
      latestDetail: null,
    });
  }

  for (const al of alerts) {
    const entry = rowMap.get(al.category);
    if (!entry) continue;
    const ageMs = Math.max(0, nowTs - al.ts);
    const reverseIdx = Math.floor(ageMs / bucketWindowMs);
    const colIdx = safeBuckets - 1 - reverseIdx;
    // Clamp older session alerts into the oldest visible bucket so history remains represented
    const targetCol = colIdx < 0 ? 0 : Math.min(safeBuckets - 1, colIdx);
    entry.cells[targetCol] += 1;
    entry.total += 1;
    if (al.severity === 'critical') {
      entry.criticalCount += 1;
    }
    if (al.ts >= entry.latestTs) {
      entry.latestTs = al.ts;
      entry.latestDetail = al.detail;
    }
  }

  let maxCellValue = 0;
  const rows = order.map((cat) => {
    const meta = HEATMAP_CATEGORIES[cat];
    const data = rowMap.get(cat)!;
    for (const c of data.cells) {
      if (c > maxCellValue) maxCellValue = c;
    }
    return {
      key: cat,
      label: mode === 'type' ? meta.typeLabel : meta.locationLabel,
      sublabel: mode === 'type' ? meta.typeSub : meta.locationSub,
      cells: data.cells,
      total: data.total,
      criticalCount: data.criticalCount,
      latestDetail: data.latestDetail,
    };
  });

  return {
    buckets,
    rows,
    maxCellValue,
    totalAlerts: alerts.length,
  };
}
