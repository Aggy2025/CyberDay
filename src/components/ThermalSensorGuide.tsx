import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Cpu,
  Droplets,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
} from 'lucide-react';
import { computeThermalLessonMetrics } from '../lib/sensorsEducation';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';

interface ThermalSensorGuideProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
}

const THERMAL_PRESETS = [
  { id: 'nominal', label: 'Centro de datos nominal', temp: 24.5, hum: 50 },
  { id: 'cpu', label: 'Sobrecarga / canal térmico', temp: 37.8, hum: 38 },
  { id: 'humid', label: 'Fallo HVAC / condensación', temp: 26.0, hum: 84 },
  { id: 'heatgun', label: 'Ataque térmico externo', temp: 44.5, hum: 30 },
];

export function ThermalSensorGuide({
  latestPacket,
  thresholds,
  telemetryActive,
}: ThermalSensorGuideProps) {
  const [followLive, setFollowLive] = useState(false);
  const [manualTemp, setManualTemp] = useState(24.5);
  const [manualHum, setManualHum] = useState(50);

  const activeTemp = followLive ? latestPacket.t : manualTemp;
  const activeHum = followLive ? latestPacket.h : manualHum;

  const metrics = useMemo(
    () => computeThermalLessonMetrics(activeTemp, activeHum, thresholds),
    [activeTemp, activeHum, thresholds],
  );

  // Diagram 2 gauge mapping (Temp 10..50 C)
  const tempPct = Math.max(0, Math.min(100, ((metrics.tempC - 10) / 40) * 100));
  const thresholdPct = Math.max(0, Math.min(100, ((thresholds.maxTempC - 10) / 40) * 100));

  const statusVisual =
    metrics.status === 'nominal'
      ? {
          textClass: 'text-emerald-700 dark:text-emerald-400',
          borderClass: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30',
          strokeHex: '#059669',
          Icon: ShieldCheck,
        }
      : metrics.status === 'warning'
        ? {
            textClass: 'text-amber-700 dark:text-amber-400',
            borderClass: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30',
            strokeHex: '#d97706',
            Icon: AlertTriangle,
          }
        : {
            textClass: 'text-red-700 dark:text-red-400',
            borderClass: 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30',
            strokeHex: '#dc2626',
            Icon: ShieldAlert,
          };

  const StatusIcon = statusVisual.Icon;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12" data-testid="thermal-sensor-guide">
      <div className="space-y-6 xl:col-span-7">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Diagrama 1. Sensor Ambiental CMOS (SHT30 · Temp y Humedad)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Explora cómo un diodo térmico de silicio y un polímero capacitivo supervisan la integridad térmica del hardware.
              </p>
            </div>

            <div
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Fuente de lectura térmica"
            >
              <button
                type="button"
                onClick={() => setFollowLive(false)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  !followLive
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                Simulador manual
              </button>
              <button
                type="button"
                onClick={() => setFollowLive(true)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  followLive
                    ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Telemetría en vivo
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="sht-temp-slider" className="font-medium text-slate-700 dark:text-slate-200">
                    Temperatura PCB
                  </label>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {metrics.tempC.toFixed(1)} °C {followLive && telemetryActive ? '(en vivo)' : ''}
                  </span>
                </div>
                <input
                  id="sht-temp-slider"
                  type="range"
                  min={15}
                  max={50}
                  step={0.5}
                  value={metrics.tempC}
                  disabled={followLive}
                  onChange={(e) => setManualTemp(Number(e.target.value))}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="sht-hum-slider" className="font-medium text-slate-700 dark:text-slate-200">
                    Humedad relativa
                  </label>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {metrics.humidityPct}% HR
                  </span>
                </div>
                <input
                  id="sht-hum-slider"
                  type="range"
                  min={20}
                  max={92}
                  step={1}
                  value={metrics.humidityPct}
                  disabled={followLive}
                  onChange={(e) => setManualHum(Number(e.target.value))}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {THERMAL_PRESETS.map((p) => {
                const isActive =
                  !followLive &&
                  Math.abs(manualTemp - p.temp) <= 0.6 &&
                  Math.abs(manualHum - p.hum) <= 2;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFollowLive(false);
                      setManualTemp(p.temp);
                      setManualHum(p.hum);
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive SVG SHT30 Internal Architecture */}
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-3 dark:border-slate-800">
            <svg
              viewBox="0 0 600 210"
              className="h-auto w-full"
              role="img"
              aria-label="Diagrama interno del sensor ambiental SHT30 con elemento térmico bandgap y capacitor higroscópico"
            >
              {/* Temp transducer */}
              <rect x="18" y="22" width="190" height="76" rx="8" fill="#0f172a" stroke={metrics.tempC > thresholds.maxTempC ? '#dc2626' : '#334155'} strokeWidth="1.6" />
              <text x="113" y="44" textAnchor="middle" fill="#fb7185" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                Sensor Bandgap Silicio
              </text>
              <text x="113" y="64" textAnchor="middle" fill="#f8fafc" fontSize="14" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {metrics.tempC.toFixed(1)} °C
              </text>
              <text x="113" y="82" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="DM Sans, sans-serif">
                V_BE cambia linealmente con T
              </text>

              {/* Humidity transducer */}
              <rect x="18" y="112" width="190" height="76" rx="8" fill="#0f172a" stroke={metrics.condensationRisk ? '#d97706' : '#334155'} strokeWidth="1.6" />
              <text x="113" y="134" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                Celda Capacitiva Polímero
              </text>
              <text x="113" y="154" textAnchor="middle" fill="#f8fafc" fontSize="14" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {metrics.humidityPct}% HR
              </text>
              <text x="113" y="172" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="DM Sans, sans-serif">
                Punto de rocío ≈ {metrics.dewPointC.toFixed(1)} °C
              </text>

              {/* ADC + I2C lines */}
              <line x1="208" y1="60" x2="270" y2="95" stroke="#94a3b8" strokeWidth="1.6" />
              <line x1="208" y1="150" x2="270" y2="115" stroke="#94a3b8" strokeWidth="1.6" />

              <rect x="270" y="64" width="110" height="82" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <text x="325" y="96" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                ADC 16-bit
              </text>
              <text x="325" y="114" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="JetBrains Mono, monospace">
                Bus I2C (0x44)
              </text>
              <text x="325" y="130" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="DM Sans, sans-serif">
                Calibración fábrica
              </text>

              <line x1="380" y1="105" x2="424" y2="105" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
              <polygon points="428,105 419,101 419,109" fill="#38bdf8" />

              {/* SOC evaluation */}
              <rect x="430" y="42" width="154" height="126" rx="8" fill="#0f172a" stroke={statusVisual.strokeHex} strokeWidth="1.8" />
              <text x="507" y="68" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                Evaluador SOC
              </text>
              <text x="507" y="92" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono, monospace">
                Límite: {thresholds.maxTempC.toFixed(1)} °C
              </text>
              <rect x="444" y="108" width="126" height="36" rx="6" fill={statusVisual.strokeHex} fillOpacity="0.22" stroke={statusVisual.strokeHex} strokeWidth="1.2" />
              <text x="507" y="130" textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontFamily="DM Sans, sans-serif" fontWeight="600">
                {metrics.status === 'nominal' ? 'Nominal' : metrics.status === 'warning' ? 'Preventivo' : 'Alerta Térmica'}
              </text>
            </svg>
          </div>

          <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3.5 ${statusVisual.borderClass}`}>
            <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${statusVisual.textClass}`} aria-hidden="true" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <span className={statusVisual.textClass}>{metrics.statusLabel}</span>
                <span className="text-slate-400" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {metrics.tempC.toFixed(1)} °C · {metrics.humidityPct}% HR · Rocío {metrics.dewPointC.toFixed(1)} °C
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{metrics.securityMeaning}</p>
            </div>
          </div>
        </section>

        {/* Diagram 2: Thermal Bar & Threshold */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Diagrama 2. Escala Térmica y Margen hasta Umbral de Alerta
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Posición actual de temperatura respecto al límite crítico configurado ({thresholds.maxTempC.toFixed(1)} °C).
          </p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="relative h-8 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500/30"
                style={{ width: `${thresholdPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-red-500/25"
                style={{ width: `${100 - thresholdPct}%` }}
              />
              {/* Threshold marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-red-600"
                style={{ left: `${thresholdPct}%` }}
              />
              {/* Current value marker */}
              <div
                className="absolute top-1 bottom-1 w-2 -translate-x-1/2 rounded-sm bg-blue-600"
                style={{ left: `${tempPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              <span>10 °C</span>
              <span>Umbral SOC: {thresholds.maxTempC.toFixed(1)} °C</span>
              <span>50 °C</span>
            </div>
          </div>
        </section>
      </div>

      {/* Right 5 cols */}
      <div className="space-y-6 xl:col-span-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-rose-500" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              ¿Qué es el sensor térmico y de humedad (SHT30)?
            </h2>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              El <strong className="text-slate-900 dark:text-slate-100">SHT30</strong> es un sensor ambiental digital calibrado de fábrica que integra dos transductores en un mismo chip CMOS: un elemento semiconductor sensible a la temperatura (<span className="font-mono">°C</span>) y un polímero dieléctrico cuya capacitancia varía con la humedad relativa (<span className="font-mono">% HR</span>).
            </p>
            <p>
              Al comunicarse por el bus digital I2C ya compensado, entrega lecturas precisas para correlacionar estrés térmico del procesador con anomalías ambientales alrededor del gabinete.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Uso en ciberseguridad dentro de la plataforma
          </h2>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>01. Canal lateral y sobrecarga térmica</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Criptominería oculta, bucles de fuerza bruta o ataques de calor elevan <span className="font-mono">t</span> por encima de <span className="font-mono">{thresholds.maxTempC.toFixed(1)} °C</span> y alimentan las características <span className="font-mono">meanTemp</span> y <span className="font-mono">stdTemp</span> del modelo <em>k-NN</em>.
              </p>
            </div>
            <div className="flex justify-center" aria-hidden="true">
              <ArrowDown className="h-4 w-4 text-slate-400" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Droplets className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                <span>02. Resiliencia OT y fallo de climatización</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Permite auditar sabotaje en sistemas HVAC de cuartos de servidores y prevenir daños físicos por condensación en la PCB.
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200 pt-3 text-xs dark:divide-slate-800 dark:border-slate-800">
            <div className="py-2 first:pt-0">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <ArrowRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                Escenario Anomalía Térmica
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Prueba el escenario <strong>Anomalía Térmica</strong> en la barra superior para observar la alerta crítica en tiempo real.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
