import type { SecurityThresholds } from './types';

export type SensorSecurityStatus = 'nominal' | 'warning' | 'critical';

export interface ImuLessonMetrics {
  accelDeltaG: number;
  gyroDps: number;
  totalAccelG: number;
  memsDisplacementUm: number;
  status: SensorSecurityStatus;
  statusLabel: string;
  securityMeaning: string;
}

export interface ThermalLessonMetrics {
  tempC: number;
  humidityPct: number;
  dewPointC: number;
  condensationRisk: boolean;
  status: SensorSecurityStatus;
  statusLabel: string;
  securityMeaning: string;
}

export interface MfaLessonMetrics {
  burstCount: number;
  maxBurst: number;
  ratioPct: number;
  status: SensorSecurityStatus;
  statusLabel: string;
  securityMeaning: string;
}

export function computeImuLessonMetrics(
  rawAccelDeltaG: number,
  rawGyroDps: number,
  thresholds: Pick<SecurityThresholds, 'maxAccelDeltaG' | 'maxGyroDps'>,
): ImuLessonMetrics {
  const accelDeltaG = Math.max(0, Math.min(1.5, Number(rawAccelDeltaG.toFixed(2))));
  const gyroDps = Math.max(0, Math.min(180, Math.round(rawGyroDps)));
  const totalAccelG = Number((1.0 + accelDeltaG).toFixed(2));
  // Illustrative MEMS proof-mass micro-displacement (in micrometers) proportional to acceleration delta
  const memsDisplacementUm = Number((accelDeltaG * 14.5).toFixed(1));

  const accelBreach = accelDeltaG > thresholds.maxAccelDeltaG;
  const gyroBreach = gyroDps > thresholds.maxGyroDps;

  if (accelBreach && gyroBreach) {
    return {
      accelDeltaG,
      gyroDps,
      totalAccelG,
      memsDisplacementUm,
      status: 'critical',
      statusLabel: 'Sabotaje Físico Crítico',
      securityMeaning:
        'Impacto y rotación simultáneos superan los umbrales: traslado o apertura violenta del equipo.',
    };
  }

  if (accelBreach || gyroBreach) {
    return {
      accelDeltaG,
      gyroDps,
      totalAccelG,
      memsDisplacementUm,
      status: 'critical',
      statusLabel: accelBreach ? 'Vibración / Impacto Anómalo' : 'Rotación / Inclinación Anómala',
      securityMeaning: accelBreach
        ? 'El acelerómetro detecta golpes o vibración mecánica por encima del límite seguro.'
        : 'El giroscopio detecta giro o inclinación sigilosa del chasis sin requerir golpe brusco.',
    };
  }

  if (
    accelDeltaG >= thresholds.maxAccelDeltaG * 0.7 ||
    gyroDps >= thresholds.maxGyroDps * 0.7
  ) {
    return {
      accelDeltaG,
      gyroDps,
      totalAccelG,
      memsDisplacementUm,
      status: 'warning',
      statusLabel: 'Micro-vibración Preventiva',
      securityMeaning:
        'Movimiento cercano al umbral de disparo; el motor k-NN evalúa si se trata de ruido ambiental.',
    };
  }

  return {
    accelDeltaG,
    gyroDps,
    totalAccelG,
    memsDisplacementUm,
    status: 'nominal',
    statusLabel: 'Estable en Reposo',
    securityMeaning:
      'Solo actúa la gravedad terrestre (|a| ≈ 1.00 g) y rotación nula (|ω| ≈ 0 dps).',
  };
}

export function computeThermalLessonMetrics(
  rawTempC: number,
  rawHumidityPct: number,
  thresholds: Pick<SecurityThresholds, 'maxTempC'>,
): ThermalLessonMetrics {
  const tempC = Math.max(10, Math.min(55, Number(rawTempC.toFixed(1))));
  const humidityPct = Math.max(10, Math.min(95, Math.round(rawHumidityPct)));

  // Magnus approximation for dew point
  const dewPointC = Number((tempC - (100 - humidityPct) / 5).toFixed(1));
  const condensationRisk = humidityPct >= 78 || tempC - dewPointC <= 3.5;

  if (tempC > thresholds.maxTempC) {
    return {
      tempC,
      humidityPct,
      dewPointC,
      condensationRisk,
      status: 'critical',
      statusLabel: 'Sobrecalentamiento / Ataque Térmico',
      securityMeaning:
        'Supera la temperatura máxima: posible sobrecarga sostenida (canal lateral), fallo HVAC o fuente de calor externa.',
    };
  }

  if (condensationRisk || tempC >= thresholds.maxTempC - 2.5) {
    return {
      tempC,
      humidityPct,
      dewPointC,
      condensationRisk,
      status: 'warning',
      statusLabel: condensationRisk ? 'Riesgo de Humedad / Condensación' : 'Deriva Térmica Preventiva',
      securityMeaning: condensationRisk
        ? 'Humedad relativa elevada respecto al punto de rocío: riesgo eléctrico sobre PCB.'
        : 'La temperatura se aproxima al umbral configurado en el Monitor SOC.',
    };
  }

  return {
    tempC,
    humidityPct,
    dewPointC,
    condensationRisk: false,
    status: 'nominal',
    statusLabel: 'Ambiente Controlado (Nominal)',
    securityMeaning:
      'Temperatura y humedad dentro de parámetros seguros para electrónica de red.',
  };
}

export function computeMfaLessonMetrics(
  rawBurstCount: number,
  thresholds: Pick<SecurityThresholds, 'maxButtonBurst'>,
): MfaLessonMetrics {
  const maxBurst = Math.max(1, thresholds.maxButtonBurst);
  const burstCount = Math.max(0, Math.min(15, Math.round(rawBurstCount)));
  const ratioPct = Math.min(100, Math.round((burstCount / maxBurst) * 100));

  if (burstCount >= maxBurst) {
    return {
      burstCount,
      maxBurst,
      ratioPct,
      status: 'critical',
      statusLabel: 'Fuerza Bruta Física Detectada',
      securityMeaning:
        'Exceso de pulsaciones en ventana de 3 s: posible intento automatizado o manual de adivinar secuencia MFA.',
    };
  }

  if (burstCount >= Math.max(2, maxBurst - 2)) {
    return {
      burstCount,
      maxBurst,
      ratioPct,
      status: 'warning',
      statusLabel: 'Actividad Intensa de Botones',
      securityMeaning:
        'Múltiples flancos detectados; una pulsación más activará bloqueo y alerta crítica SOC.',
    };
  }

  return {
    burstCount,
    maxBurst,
    ratioPct,
    status: 'nominal',
    statusLabel: 'Uso Autorizado (Nominal)',
    securityMeaning:
      'Interacción normal con los botones físicos A y B/C sin patrón de fuerza bruta.',
  };
}
