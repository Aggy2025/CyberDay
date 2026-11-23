import type { SecurityThresholds } from './types';

export type OpticalSecurityZone = 'blinding' | 'safe' | 'intrusion';

export interface OpticalLessonMetrics {
  /** Input light intensity in IdeaSense digital counts (0 - 1000) */
  lightCounts: number;
  /** Simulated classic LDR resistance in kOhm (inversely proportional to light) */
  ldrResistanceKOhm: number;
  /** Divider output voltage (0 - 3.3V) with 10 kOhm reference resistor */
  dividerVoltageV: number;
  /** Classified physical security zone */
  zone: OpticalSecurityZone;
  /** Human-readable state label (dual-coded with color) */
  zoneLabel: string;
  /** Short security interpretation */
  securityMeaning: string;
}

export interface OpticalPreset {
  id: string;
  label: string;
  lightCounts: number;
  summary: string;
}

export const OPTICAL_LESSON_PRESETS: OpticalPreset[] = [
  {
    id: 'sealed',
    label: 'Gabinete sellado',
    lightCounts: 260,
    summary: 'Iluminación interna estable dentro de un rack cerrado sin manipulación.',
  },
  {
    id: 'blinding',
    label: 'Sensor cubierto',
    lightCounts: 15,
    summary: 'Bloqueo físico intencional (cinta o cubierta opaca) para anular lecturas.',
  },
  {
    id: 'breach',
    label: 'Apertura de gabinete',
    lightCounts: 790,
    summary: 'Entrada súbita de luz ambiental al abrir la tapa del equipo protegido.',
  },
  {
    id: 'injection',
    label: 'Inyección óptica',
    lightCounts: 940,
    summary: 'Haz de linterna o láser dirigido al sensor para exfiltrar o alterar bits.',
  },
];

/**
 * Computes educational LDR physical equivalents (resistance & divider voltage)
 * alongside the platform's physical intrusion classification.
 */
export function computeOpticalLessonMetrics(
  rawCounts: number,
  thresholds: Pick<SecurityThresholds, 'minLightCounts' | 'maxLightCounts'>,
): OpticalLessonMetrics {
  const lightCounts = Math.max(0, Math.min(1000, Math.round(rawCounts)));

  // Classic CdS LDR model: ~100 kOhm in total darkness down to ~0.4 kOhm under intense light
  const normalized = lightCounts / 1000;
  const ldrResistanceKOhm = Number((100 * Math.pow(1 - normalized * 0.96, 3.2) + 0.4).toFixed(1));

  // Voltage divider with Vcc = 3.3V and fixed R_ref = 10 kOhm (LDR on top, R_ref to GND)
  const rRefKOhm = 10;
  const dividerVoltageV = Number(
    ((3.3 * rRefKOhm) / (ldrResistanceKOhm + rRefKOhm)).toFixed(2),
  );

  if (lightCounts < thresholds.minLightCounts) {
    return {
      lightCounts,
      ldrResistanceKOhm,
      dividerVoltageV,
      zone: 'blinding',
      zoneLabel: 'Ceguera / Bloqueo',
      securityMeaning:
        'Lectura por debajo del mínimo permitido: posible obstrucción deliberada del sensor.',
    };
  }

  if (lightCounts > thresholds.maxLightCounts) {
    return {
      lightCounts,
      ldrResistanceKOhm,
      dividerVoltageV,
      zone: 'intrusion',
      zoneLabel: 'Intrusión Óptica',
      securityMeaning:
        'Pico luminoso sobre el umbral seguro: apertura física del chasis o inyección óptica.',
    };
  }

  return {
    lightCounts,
    ldrResistanceKOhm,
    dividerVoltageV,
    zone: 'safe',
    zoneLabel: 'Sellado (Nominal)',
    securityMeaning:
      'Flujo de fotones estable dentro de la banda segura configurada en el Monitor SOC.',
  };
}
