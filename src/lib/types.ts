export type ConnectionMode = 'disconnected' | 'ble' | 'demo';

export type CyberScenario =
  | 'normal'
  | 'tampering'
  | 'optical_breach'
  | 'thermal_attack'
  | 'brute_force';

export type SecurityClassId =
  | 'normal'
  | 'tampering'
  | 'optical_breach'
  | 'side_channel';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface TelemetryPacket {
  /** Temperature in Celsius (SHT30) */
  t: number;
  /** Relative humidity percentage (SHT30) */
  h: number;
  /** Ambient light counts (LTR-303) */
  l: number;
  /** Accelerometer X in g */
  ax: number;
  /** Accelerometer Y in g */
  ay: number;
  /** Accelerometer Z in g */
  az: number;
  /** Gyroscope X in dps */
  gx: number;
  /** Gyroscope Y in dps */
  gy: number;
  /** Gyroscope Z in dps */
  gz: number;
  /** Physical button A state (0 or 1) */
  ba: number;
  /** Physical button B/C state (0 or 1) */
  bb: number;
  /** Firmware bitmask: 0 = real sensors, 1=T/H sim, 2=IMU sim, 4=Light sim */
  sim?: number;
  /** Timestamp in ms (assigned on receipt/generation) */
  ts: number;
}

export interface SecurityThresholds {
  /** Max allowed acceleration delta from 1g rest (in g) */
  maxAccelDeltaG: number;
  /** Max allowed gyroscope rotation magnitude (in dps) */
  maxGyroDps: number;
  /** Min light threshold (counts) - below implies blocked/covered */
  minLightCounts: number;
  /** Max light threshold (counts) - above implies enclosure opened or optical injection */
  maxLightCounts: number;
  /** Max temperature in Celsius */
  maxTempC: number;
  /** Max button presses within 3 seconds before brute-force alert */
  maxButtonBurst: number;
}

export interface SecurityAlert {
  id: string;
  ts: number;
  severity: AlertSeverity;
  category: 'tampering' | 'optical' | 'thermal' | 'access';
  title: string;
  detail: string;
  vectorTag: string;
}

export interface FeatureVector16 {
  meanAx: number;
  meanAy: number;
  meanAz: number;
  meanGx: number;
  meanGy: number;
  meanGz: number;
  meanLight: number;
  meanTemp: number;
  stdAx: number;
  stdAy: number;
  stdAz: number;
  stdGx: number;
  stdGy: number;
  stdGz: number;
  stdLight: number;
  stdTemp: number;
}

export interface KnnSample {
  id: string;
  label: SecurityClassId;
  source: 'baseline' | 'captured';
  createdAt: number;
  features: number[]; // 16 normalized or raw feature values
}

export interface KnnPrediction {
  predictedClass: SecurityClassId;
  confidence: number; // 0 to 100
  minDistance: number;
  isAnomaly: boolean;
  zScoreMax: number;
  neighborsCount: number;
}

export type DataOriginLabel = 'REAL_BLE' | 'FIRMWARE_SIMULADO' | 'DEMO_SIMULADO' | 'SIN_VERIFICAR';

export interface AuditRow {
  isoTime: string;
  elapsedSec: number;
  origenDatos: DataOriginLabel;
  t: number;
  h: number;
  l: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  ba: number;
  bb: number;
  predictedClass: string;
  anomalyDistance: number;
  note: string;
}

export interface GeminiIncidentAnalysis {
  resumenEjecutivo: string;
  nivelRiesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  vectorAtaque: string;
  indicadoresClave: string[];
  accionesMitigacion: string[];
  reglaDeteccionPython: string;
}

export type HeatmapGroupingMode = 'type' | 'location';

export interface HeatmapRow {
  key: string;
  label: string;
  sublabel: string;
  cells: number[];
  total: number;
  criticalCount: number;
  latestDetail: string | null;
}

export interface HeatmapMatrix {
  buckets: string[];
  rows: HeatmapRow[];
  maxCellValue: number;
  totalAlerts: number;
}

export type ChatRoleId = 'soc_analyst' | 'iot_architect' | 'workshop_mentor';
export type FreeGeminiModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: FreeGeminiModel;
  ts: number;
}

export type ActiveTab =
  | 'soc'
  | 'twin3d'
  | 'ailab'
  | 'game'
  | 'audit'
  | 'chat'
  | 'firmware';
