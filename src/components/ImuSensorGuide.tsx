import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Cpu,
  Move,
  Radio,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { computeAccelMagnitude, computeGyroMagnitude } from '../lib/cyberEngine';
import { computeImuLessonMetrics } from '../lib/sensorsEducation';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';

interface ImuSensorGuideProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
}

const IMU_PRESETS = [
  { id: 'rest', label: 'Reposo en rack', accel: 0.01, gyro: 1 },
  { id: 'vib', label: 'Vibración / taladro', accel: 0.42, gyro: 18 },
  { id: 'tilt', label: 'Apertura abisagrada', accel: 0.14, gyro: 78 },
  { id: 'tamper', label: 'Impacto y traslado', accel: 0.88, gyro: 125 },
];

export function ImuSensorGuide({
  latestPacket,
  thresholds,
  telemetryActive,
}: ImuSensorGuideProps) {
  const [followLive, setFollowLive] = useState(false);
  const [manualAccelDelta, setManualAccelDelta] = useState(0.02);
  const [manualGyro, setManualGyro] = useState(2);

  const liveAccelDelta = Math.abs(computeAccelMagnitude(latestPacket) - 1.0);
  const liveGyro = computeGyroMagnitude(latestPacket);

  const activeAccelDelta = followLive ? liveAccelDelta : manualAccelDelta;
  const activeGyro = followLive ? liveGyro : manualGyro;

  const metrics = useMemo(
    () => computeImuLessonMetrics(activeAccelDelta, activeGyro, thresholds),
    [activeAccelDelta, activeGyro, thresholds],
  );

  // 2D safe zone diagram coordinates (X: Δ|a| 0..1.2g, Y: |ω| 0..150 dps)
  const plot = useMemo(() => {
    const width = 560;
    const height = 200;
    const padLeft = 52;
    const padRight = 20;
    const padTop = 24;
    const padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxXVal = 1.2;
    const maxYVal = 150;
    const toX = (a: number) => padLeft + (Math.min(maxXVal, Math.max(0, a)) / maxXVal) * plotW;
    const toY = (g: number) => padTop + plotH - (Math.min(maxYVal, Math.max(0, g)) / maxYVal) * plotH;

    const safeX = toX(thresholds.maxAccelDeltaG);
    const safeY = toY(thresholds.maxGyroDps);

    return {
      width,
      height,
      padLeft,
      padTop,
      plotW,
      plotH,
      safeRectW: Math.max(0, safeX - padLeft),
      safeRectH: Math.max(0, padTop + plotH - safeY),
      safeX,
      safeY,
      dotX: toX(metrics.accelDeltaG),
      dotY: toY(metrics.gyroDps),
    };
  }, [metrics.accelDeltaG, metrics.gyroDps, thresholds]);

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
  const massOffsetPx = Math.min(22, metrics.accelDeltaG * 22);
  const tiltDeg = Math.min(35, Math.round(metrics.gyroDps * 0.24));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12" data-testid="imu-sensor-guide">
      {/* Left 7 cols: Interactive MEMS Schematic + 2D Zone Plot */}
      <div className="space-y-6 xl:col-span-7">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Diagrama 1. Principio MEMS: Acelerómetro y Giroscopio (LSM6DS3TR-C · 0x6A)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Visualiza cómo se desplaza la micro-masa sísmica lineal (g) y el marco rotacional (dps) ante sabotaje físico.
              </p>
            </div>

            <div
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Fuente de lectura IMU"
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
                  <label htmlFor="imu-accel-slider" className="font-medium text-slate-700 dark:text-slate-200">
                    Vibración lineal Δ|a|
                  </label>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {metrics.accelDeltaG.toFixed(2)} g
                  </span>
                </div>
                <input
                  id="imu-accel-slider"
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.02}
                  value={metrics.accelDeltaG}
                  disabled={followLive}
                  onChange={(e) => setManualAccelDelta(Number(e.target.value))}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="imu-gyro-slider" className="font-medium text-slate-700 dark:text-slate-200">
                    Rotación angular |ω|
                  </label>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {metrics.gyroDps} dps {followLive && telemetryActive ? '(en vivo)' : ''}
                  </span>
                </div>
                <input
                  id="imu-gyro-slider"
                  type="range"
                  min={0}
                  max={150}
                  step={2}
                  value={metrics.gyroDps}
                  disabled={followLive}
                  onChange={(e) => setManualGyro(Number(e.target.value))}
                  className="mt-2 w-full accent-blue-600 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {IMU_PRESETS.map((p) => {
                const isActive =
                  !followLive &&
                  Math.abs(manualAccelDelta - p.accel) <= 0.03 &&
                  Math.abs(manualGyro - p.gyro) <= 4;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFollowLive(false);
                      setManualAccelDelta(p.accel);
                      setManualGyro(p.gyro);
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

          {/* Interactive SVG MEMS Accelerometer + Gyroscope */}
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-3 dark:border-slate-800">
            <svg
              viewBox="0 0 600 220"
              className="h-auto w-full"
              role="img"
              aria-label="Diagrama MEMS de acelerómetro con masa sísmica y giroscopio rotacional"
            >
              {/* Left panel: MEMS Accelerometer */}
              <rect x="14" y="16" width="276" height="188" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <text x="152" y="38" textAnchor="middle" fill="#38bdf8" fontSize="11.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                Acelerómetro MEMS (Ejes X, Y, Z)
              </text>
              <text x="152" y="54" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="DM Sans, sans-serif">
                F = m · a desplaza placas capacitivas
              </text>

              {/* Micro-springs + Proof mass */}
              <line x1="48" y1="115" x2={98 + massOffsetPx} y2="115" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" />
              <line x1={206 + massOffsetPx} y1="115" x2="256" y2="115" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" />
              <rect x="44" y="96" width="6" height="38" rx="2" fill="#475569" />
              <rect x="254" y="96" width="6" height="38" rx="2" fill="#475569" />

              <rect
                x={98 + massOffsetPx}
                y="90"
                width="108"
                height="50"
                rx="6"
                fill="#1e293b"
                stroke={statusVisual.strokeHex}
                strokeWidth="2"
              />
              <text
                x={152 + massOffsetPx}
                y="112"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                Masa m
              </text>
              <text
                x={152 + massOffsetPx}
                y="128"
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                Δx ≈ {metrics.memsDisplacementUm} µm
              </text>

              <text x="152" y="182" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                |a| = {metrics.totalAccelG.toFixed(2)} g · Δ|a| = {metrics.accelDeltaG.toFixed(2)} g
              </text>

              {/* Right panel: MEMS Gyroscope */}
              <rect x="310" y="16" width="276" height="188" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <text x="448" y="38" textAnchor="middle" fill="#fb7185" fontSize="11.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                Giroscopio MEMS (Velocidad |ω|)
              </text>
              <text x="448" y="54" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="DM Sans, sans-serif">
                Efecto Coriolis mide rotación en °/s (dps)
              </text>

              <circle cx="448" cy="115" r="44" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
              <g transform={`rotate(${tiltDeg} 448 115)`}>
                <rect
                  x="412"
                  y="98"
                  width="72"
                  height="34"
                  rx="6"
                  fill="#1e293b"
                  stroke={metrics.gyroDps > thresholds.maxGyroDps ? '#dc2626' : '#fb7185'}
                  strokeWidth="2"
                />
                <line x1="418" y1="115" x2="478" y2="115" stroke="#94a3b8" strokeWidth="1.2" />
                <circle cx="448" cy="115" r="4" fill="#fb7185" />
              </g>

              <text x="448" y="182" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                |ω| = {metrics.gyroDps} dps · Inclinación ~{tiltDeg}°
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
                  Δ|a| = {metrics.accelDeltaG.toFixed(2)} g · |ω| = {metrics.gyroDps} dps
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{metrics.securityMeaning}</p>
            </div>
          </div>
        </section>

        {/* Diagram 2: 2D Threshold Plane */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Diagrama 2. Plano de Seguridad Mecánica (Δ|a| vs |ω|)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Umbrales SOC: Δ|a| ≤ {thresholds.maxAccelDeltaG.toFixed(2)} g y |ω| ≤ {thresholds.maxGyroDps} dps.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <svg
              viewBox={`0 0 ${plot.width} ${plot.height}`}
              className="h-auto w-full"
              role="img"
              aria-label="Plano de seguridad 2D de aceleración versus rotación giroscópica"
            >
              {/* Tamper region */}
              <rect
                x={plot.padLeft}
                y={plot.padTop}
                width={plot.plotW}
                height={plot.plotH}
                fill="#ef4444"
                fillOpacity="0.11"
              />
              {/* Safe zone rectangle */}
              <rect
                x={plot.padLeft}
                y={plot.safeY}
                width={plot.safeRectW}
                height={plot.safeRectH}
                fill="#10b981"
                fillOpacity="0.18"
                stroke="#059669"
                strokeDasharray="4 3"
                strokeWidth="1.3"
              />

              <text x={plot.padLeft + plot.safeRectW / 2} y={plot.safeY + 15} textAnchor="middle" fill="#059669" fontSize="10" fontFamily="DM Sans, sans-serif" fontWeight="600">
                Zona Nominal
              </text>
              <text x={plot.padLeft + plot.plotW * 0.7} y={plot.padTop + 16} textAnchor="middle" fill="#dc2626" fontSize="10" fontFamily="DM Sans, sans-serif" fontWeight="600">
                Zona de Sabotaje Físico (Tampering)
              </text>

              <line x1={plot.padLeft} y1={plot.padTop} x2={plot.padLeft} y2={plot.padTop + plot.plotH} stroke="#64748b" strokeWidth="1.2" />
              <line x1={plot.padLeft} y1={plot.padTop + plot.plotH} x2={plot.padLeft + plot.plotW} y2={plot.padTop + plot.plotH} stroke="#64748b" strokeWidth="1.2" />

              <circle cx={plot.dotX} cy={plot.dotY} r="6" fill={statusVisual.strokeHex} stroke="#ffffff" strokeWidth="2" />

              <text x={plot.padLeft - 6} y={plot.padTop + 6} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">
                150 dps
              </text>
              <text x={plot.padLeft - 6} y={plot.padTop + plot.plotH} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">
                0
              </text>
              <text x={plot.padLeft} y={plot.height - 10} textAnchor="start" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">
                0.0 g
              </text>
              <text x={plot.padLeft + plot.plotW / 2} y={plot.height - 10} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">
                0.6 g (Δ|a|)
              </text>
              <text x={plot.padLeft + plot.plotW} y={plot.height - 10} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">
                1.2 g
              </text>
            </svg>
          </div>
        </section>
      </div>

      {/* Right 5 cols: Concept & Detection Pipeline */}
      <div className="space-y-6 xl:col-span-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              ¿Qué miden el Acelerómetro y el Giroscopio?
            </h2>
          </div>

          <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              La unidad inercial (<strong className="text-slate-900 dark:text-slate-100">IMU LSM6DS3TR-C</strong>, dirección I2C <span className="font-mono">0x6A</span>) combina dos sensores MEMS complementarios en 6 grados de libertad. La librería <span className="font-mono">ideasense.py</span> entrega <span className="font-mono">m/s²</span> y <span className="font-mono">rad/s</span>, que <span className="font-mono">code.py</span> convierte a <span className="font-mono">g</span> y <span className="font-mono">dps</span>:
            </p>
            <p>
              <strong>1. Acelerómetro (ax, ay, az en g):</strong> mide aceleración lineal y gravedad. En reposo la magnitud total es <span className="font-mono">|a| ≈ 1.00 g</span>; cualquier golpe o vibración eleva <span className="font-mono">Δ|a| = ||a| - 1.0|</span>.
            </p>
            <p>
              <strong>2. Giroscopio (gx, gy, gz en dps):</strong> mide velocidad de rotación angular en grados por segundo, detectando inclinaciones lentas o apertura de puertas con bisagra aunque no haya impacto.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Cómo detecta sabotaje físico en la plataforma
          </h2>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>01. Vectores 3D a 25 Hz y Gemelo 3D</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Alimenta el osciloscopio en vivo, inclina el modelo <strong>Gemelo 3D</strong> en Three.js y sirve de control de movimiento en <strong>Firewall Interceptor</strong>.
              </p>
            </div>
            <div className="flex justify-center" aria-hidden="true">
              <ArrowDown className="h-4 w-4 text-slate-400" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Cpu className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                <span>02. Reglas + 12 características Edge AI k-NN</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Genera 12 de las 16 dimensiones del modelo <em>k-NN</em> (medias y desviaciones de <span className="font-mono">ax..gz</span>) para distinguir vibración normal de extracción física.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Amenazas físicas mitigadas
          </h2>
          <div className="mt-3 divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <div className="py-2.5 first:pt-0">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <ArrowRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                Extracción o robo de nodo IoT (MITRE T1200)
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Desmontar un equipo o desconectar cables produce picos en Δ|a| y |ω| registrados de inmediato en el SOC.
              </p>
            </div>
            <div className="py-2.5 last:pb-0">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <RotateCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                Manipulación de chasis sin impacto
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Inclinar cuidadosamente la tarjeta dispara la alerta mediante la magnitud rotacional del giroscopio.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
