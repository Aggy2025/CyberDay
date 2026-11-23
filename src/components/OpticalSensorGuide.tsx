import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Radio,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import {
  computeOpticalLessonMetrics,
  OPTICAL_LESSON_PRESETS,
} from '../lib/opticalEducation';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';

interface OpticalSensorGuideProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
}

export function OpticalSensorGuide({
  latestPacket,
  thresholds,
  telemetryActive,
}: OpticalSensorGuideProps) {
  const [followLive, setFollowLive] = useState(false);
  const [manualCounts, setManualCounts] = useState(260);

  const activeCounts = followLive ? latestPacket.l : manualCounts;

  const metrics = useMemo(
    () => computeOpticalLessonMetrics(activeCounts, thresholds),
    [activeCounts, thresholds],
  );

  // Build curve points for Diagram 2 (Response Curve: light 0..1000 vs divider voltage 0..3.3V)
  const curveGeometry = useMemo(() => {
    const width = 560;
    const height = 190;
    const padLeft = 46;
    const padRight = 18;
    const padTop = 28;
    const padBottom = 34;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const toX = (counts: number) => padLeft + (Math.max(0, Math.min(1000, counts)) / 1000) * plotW;
    const toY = (voltage: number) => padTop + plotH - (Math.max(0, Math.min(3.3, voltage)) / 3.3) * plotH;

    const samples: string[] = [];
    for (let c = 0; c <= 1000; c += 25) {
      const m = computeOpticalLessonMetrics(c, thresholds);
      const x = toX(c).toFixed(1);
      const y = toY(m.dividerVoltageV).toFixed(1);
      samples.push(`${c === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    return {
      width,
      height,
      padLeft,
      padTop,
      plotW,
      plotH,
      pathD: samples.join(' '),
      minX: toX(thresholds.minLightCounts),
      maxX: toX(thresholds.maxLightCounts),
      currentX: toX(metrics.lightCounts),
      currentY: toY(metrics.dividerVoltageV),
    };
  }, [metrics.dividerVoltageV, metrics.lightCounts, thresholds]);

  const photonIntensity = Math.max(0.15, Math.min(1, metrics.lightCounts / 1000));
  const zoneVisual =
    metrics.zone === 'safe'
      ? {
          textClass: 'text-emerald-700 dark:text-emerald-400',
          borderClass: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30',
          strokeHex: '#059669',
          Icon: ShieldCheck,
        }
      : metrics.zone === 'blinding'
        ? {
            textClass: 'text-amber-700 dark:text-amber-400',
            borderClass: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30',
            strokeHex: '#d97706',
            Icon: EyeOff,
          }
        : {
            textClass: 'text-red-700 dark:text-red-400',
            borderClass: 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30',
            strokeHex: '#dc2626',
            Icon: ShieldAlert,
          };

  const ZoneIcon = zoneVisual.Icon;

  return (
    <div className="space-y-6" data-testid="optical-sensor-guide">
      {/* Main Two-Zone Educational Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 7 cols: Interactive Diagrams & Live Response Sandbox */}
        <div className="space-y-6 xl:col-span-7">
          {/* Interactive Controls + Diagram 1: LDR Physical Circuit */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Diagrama 1. Principio Físico de un Sensor de Luz (LDR)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Manipula la luz incidente o enlaza el sensor real para ver cómo varía la resistencia y el voltaje de salida.
                </p>
              </div>

              <div
                className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
                role="group"
                aria-label="Fuente de lectura óptica"
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

            {/* Light Intensity Slider + Presets */}
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <label
                  htmlFor="ldr-light-slider"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  Intensidad luminosa incidente
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {metrics.lightCounts} cuentas {followLive ? (telemetryActive ? '(en vivo)' : '(última lectura)') : '(simulado)'}
                </span>
              </div>

              <input
                id="ldr-light-slider"
                type="range"
                min={0}
                max={1000}
                step={5}
                value={metrics.lightCounts}
                disabled={followLive}
                onChange={(e) => setManualCounts(Number(e.target.value))}
                className="w-full accent-blue-600 disabled:opacity-60"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {OPTICAL_LESSON_PRESETS.map((preset) => {
                  const isActive = !followLive && Math.abs(manualCounts - preset.lightCounts) <= 15;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFollowLive(false);
                        setManualCounts(preset.lightCounts);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive SVG Circuit Diagram: Photons -> LDR Voltage Divider -> ESP32 */}
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-3 dark:border-slate-800">
              <svg
                viewBox="0 0 600 225"
                className="h-auto w-full"
                role="img"
                aria-label="Diagrama esquemático de un sensor de luz LDR en divisor de tensión conectado a un microcontrolador"
              >
                {/* Background subtle grid */}
                <defs>
                  <pattern id="ldr-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="0.8"
                    />
                  </pattern>
                </defs>
                <rect width="600" height="225" fill="url(#ldr-grid)" rx="6" />

                {/* Light source & Photon rays */}
                <circle
                  cx="72"
                  cy="52"
                  r={14 + photonIntensity * 8}
                  fill="#f59e0b"
                  fillOpacity={0.14 + photonIntensity * 0.28}
                />
                <circle
                  cx="72"
                  cy="52"
                  r="11"
                  fill="#fbbf24"
                  fillOpacity={0.35 + photonIntensity * 0.65}
                />
                <text
                  x="72"
                  y="24"
                  textAnchor="middle"
                  fill="#fcd34d"
                  fontSize="11"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  Fotones (hν)
                </text>

                {/* Two diagonal arrows hitting LDR symbol */}
                <line
                  x1="98"
                  y1="56"
                  x2="150"
                  y2="78"
                  stroke="#fbbf24"
                  strokeWidth={1.5 + photonIntensity * 2}
                  strokeOpacity={0.3 + photonIntensity * 0.7}
                />
                <polygon
                  points="154,80 144,79 148,72"
                  fill="#fbbf24"
                  fillOpacity={0.3 + photonIntensity * 0.7}
                />
                <line
                  x1="92"
                  y1="74"
                  x2="144"
                  y2="96"
                  stroke="#fbbf24"
                  strokeWidth={1.5 + photonIntensity * 2}
                  strokeOpacity={0.3 + photonIntensity * 0.7}
                />
                <polygon
                  points="148,98 138,97 142,90"
                  fill="#fbbf24"
                  fillOpacity={0.3 + photonIntensity * 0.7}
                />

                {/* Vcc Rail */}
                <line x1="210" y1="26" x2="290" y2="26" stroke="#38bdf8" strokeWidth="2" />
                <text
                  x="250"
                  y="18"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  Vcc = 3.3 V
                </text>
                <line x1="250" y1="26" x2="250" y2="54" stroke="#94a3b8" strokeWidth="2" />

                {/* LDR Symbol (circle + zigzag resistor) */}
                <circle
                  cx="250"
                  cy="84"
                  r="30"
                  fill="#0f172a"
                  stroke={zoneVisual.strokeHex}
                  strokeWidth="2.2"
                />
                <path
                  d="M 250 54 L 250 64 L 241 68 L 259 75 L 241 82 L 259 89 L 241 96 L 250 100 L 250 114"
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <text
                  x="196"
                  y="132"
                  textAnchor="end"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  LDR
                </text>
                <text
                  x="196"
                  y="146"
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {metrics.ldrResistanceKOhm} kΩ
                </text>

                {/* Divider Junction Node (Vout) */}
                <line x1="250" y1="114" x2="250" y2="146" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="250" cy="130" r="4.5" fill="#38bdf8" />
                <line x1="250" y1="130" x2="365" y2="130" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
                <polygon points="370,130 361,126 361,134" fill="#38bdf8" />

                <text
                  x="312"
                  y="120"
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize="10.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  Vout = {metrics.dividerVoltageV.toFixed(2)} V
                </text>

                {/* Fixed Reference Resistor R_ref */}
                <path
                  d="M 250 146 L 242 151 L 258 157 L 242 163 L 258 169 L 242 175 L 250 180"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <text
                  x="272"
                  y="167"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  R_ref 10 kΩ
                </text>

                {/* GND Symbol */}
                <line x1="250" y1="180" x2="250" y2="196" stroke="#94a3b8" strokeWidth="2" />
                <line x1="236" y1="196" x2="264" y2="196" stroke="#94a3b8" strokeWidth="2" />
                <line x1="241" y1="202" x2="259" y2="202" stroke="#94a3b8" strokeWidth="1.8" />
                <line x1="246" y1="208" x2="254" y2="208" stroke="#94a3b8" strokeWidth="1.5" />

                {/* MCU / IdeaSense Explorer Box */}
                <rect
                  x="374"
                  y="44"
                  width="206"
                  height="148"
                  rx="10"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.6"
                />
                <text
                  x="477"
                  y="68"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="12"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight="700"
                >
                  ESP32 / IdeaSense Explorer
                </text>
                <text
                  x="477"
                  y="86"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                >
                  Equivalente digital: LTR-303 (I2C 0x29)
                </text>

                <rect x="392" y="102" width="170" height="36" rx="6" fill="#1e293b" />
                <text
                  x="477"
                  y="124"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="12"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  Lectura: {metrics.lightCounts} cuentas
                </text>

                <rect
                  x="392"
                  y="148"
                  width="170"
                  height="30"
                  rx="6"
                  fill={zoneVisual.strokeHex}
                  fillOpacity="0.22"
                  stroke={zoneVisual.strokeHex}
                  strokeWidth="1.2"
                />
                <text
                  x="477"
                  y="167"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  {metrics.zoneLabel}
                </text>
              </svg>
            </div>

            {/* Live Dual-Coded Security Interpretation Strip */}
            <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3.5 ${zoneVisual.borderClass}`}>
              <ZoneIcon className={`mt-0.5 h-4 w-4 shrink-0 ${zoneVisual.textClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-xs">
                <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <span className={zoneVisual.textClass}>{metrics.zoneLabel}</span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    R_LDR ≈ {metrics.ldrResistanceKOhm} kΩ · Vout ≈ {metrics.dividerVoltageV.toFixed(2)} V
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{metrics.securityMeaning}</p>
              </div>
            </div>
          </section>

          {/* Diagram 2: Response Curve & Intrusion Bands */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Diagrama 2. Curva de Respuesta y Bandas de Seguridad
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Banda segura actual configurada en el Monitor SOC: {thresholds.minLightCounts} – {thresholds.maxLightCounts} cuentas.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>Bloqueo (&lt;{thresholds.minLightCounts})</span>
                <span aria-hidden="true">·</span>
                <span>Sellado</span>
                <span aria-hidden="true">·</span>
                <span>Intrusión (&gt;{thresholds.maxLightCounts})</span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
              <svg
                viewBox={`0 0 ${curveGeometry.width} ${curveGeometry.height}`}
                className="h-auto w-full"
                role="img"
                aria-label="Curva de respuesta voltaje versus intensidad de luz con bandas de seguridad física"
              >
                {/* Blinding zone shading */}
                <rect
                  x={curveGeometry.padLeft}
                  y={curveGeometry.padTop}
                  width={Math.max(0, curveGeometry.minX - curveGeometry.padLeft)}
                  height={curveGeometry.plotH}
                  fill="#f59e0b"
                  fillOpacity="0.14"
                />
                {/* Safe sealed zone shading */}
                <rect
                  x={curveGeometry.minX}
                  y={curveGeometry.padTop}
                  width={Math.max(0, curveGeometry.maxX - curveGeometry.minX)}
                  height={curveGeometry.plotH}
                  fill="#10b981"
                  fillOpacity="0.12"
                />
                {/* Intrusion zone shading */}
                <rect
                  x={curveGeometry.maxX}
                  y={curveGeometry.padTop}
                  width={Math.max(0, curveGeometry.padLeft + curveGeometry.plotW - curveGeometry.maxX)}
                  height={curveGeometry.plotH}
                  fill="#ef4444"
                  fillOpacity="0.14"
                />

                {/* Axes */}
                <line
                  x1={curveGeometry.padLeft}
                  y1={curveGeometry.padTop}
                  x2={curveGeometry.padLeft}
                  y2={curveGeometry.padTop + curveGeometry.plotH}
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
                <line
                  x1={curveGeometry.padLeft}
                  y1={curveGeometry.padTop + curveGeometry.plotH}
                  x2={curveGeometry.padLeft + curveGeometry.plotW}
                  y2={curveGeometry.padTop + curveGeometry.plotH}
                  stroke="#64748b"
                  strokeWidth="1.2"
                />

                {/* Threshold dashed lines */}
                <line
                  x1={curveGeometry.minX}
                  y1={curveGeometry.padTop}
                  x2={curveGeometry.minX}
                  y2={curveGeometry.padTop + curveGeometry.plotH}
                  stroke="#d97706"
                  strokeDasharray="4 3"
                  strokeWidth="1.4"
                />
                <line
                  x1={curveGeometry.maxX}
                  y1={curveGeometry.padTop}
                  x2={curveGeometry.maxX}
                  y2={curveGeometry.padTop + curveGeometry.plotH}
                  stroke="#dc2626"
                  strokeDasharray="4 3"
                  strokeWidth="1.4"
                />

                {/* Zone captions above plot area so curve & marker never collide */}
                <text
                  x={(curveGeometry.minX + curveGeometry.maxX) / 2}
                  y={15}
                  textAnchor="middle"
                  fill="#059669"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  Zona Sellada Segura
                </text>
                <text
                  x={(curveGeometry.maxX + curveGeometry.padLeft + curveGeometry.plotW) / 2}
                  y={15}
                  textAnchor="middle"
                  fill="#dc2626"
                  fontSize="10"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                >
                  Alerta Intrusión
                </text>

                {/* Non-linear LDR divider curve */}
                <path
                  d={curveGeometry.pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.4"
                />

                {/* Active telemetry marker */}
                <line
                  x1={curveGeometry.currentX}
                  y1={curveGeometry.padTop}
                  x2={curveGeometry.currentX}
                  y2={curveGeometry.padTop + curveGeometry.plotH}
                  stroke={zoneVisual.strokeHex}
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                />
                <circle
                  cx={curveGeometry.currentX}
                  cy={curveGeometry.currentY}
                  r="5.5"
                  fill={zoneVisual.strokeHex}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Axis labels */}
                <text
                  x={curveGeometry.padLeft - 6}
                  y={curveGeometry.padTop + 5}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  3.3V
                </text>
                <text
                  x={curveGeometry.padLeft - 6}
                  y={curveGeometry.padTop + curveGeometry.plotH}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  0V
                </text>
                <text
                  x={curveGeometry.padLeft}
                  y={curveGeometry.height - 10}
                  textAnchor="start"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  0 (Oscuridad)
                </text>
                <text
                  x={curveGeometry.padLeft + curveGeometry.plotW / 2}
                  y={curveGeometry.height - 10}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  500 cuentas
                </text>
                <text
                  x={curveGeometry.padLeft + curveGeometry.plotW}
                  y={curveGeometry.height - 10}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  1000 (Luz intensa)
                </text>
              </svg>
            </div>
          </section>
        </div>

        {/* Right 5 cols: Concept Explanation & Platform Detection Pipeline */}
        <div className="space-y-6 xl:col-span-5">
          {/* Concept Cards */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                ¿Qué es un sensor de luz (LDR)?
              </h2>
            </div>

            <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Un sensor de luz tipo <strong className="text-slate-900 dark:text-slate-100">LDR</strong> (<em>Light Dependent Resistor</em> o fotorresistencia) es un componente semiconductor cuya resistencia eléctrica disminuye conforme aumenta la luz que incide sobre su superficie fotosensible.
              </p>
              <p>
                En oscuridad ofrece decenas de kiloohmios (<span className="font-mono">~100 kΩ</span>); al recibir fotones libera electrones en su material y cae por debajo de <span className="font-mono">1 kΩ</span>. Al conectarlo en un divisor de tensión, esa variación se convierte en una señal medible por un microcontrolador.
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Del LDR clásico al sensor de luz digital LTR-303
              </div>
              <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                Mientras un LDR analógico requiere calibrar un pin ADC, la tarjeta <strong className="text-slate-900 dark:text-slate-100">IdeaSense Explorer</strong> integra el sensor de luz digital <span className="font-mono">LTR-303</span> en el bus I2C (<span className="font-mono">0x29</span>), enviando lecturas numéricas directas a <span className="font-mono">25 Hz</span> sobre Bluetooth LE para detectar anomalías físicas sin ruido de conversión.
              </p>
            </div>
          </section>

          {/* Diagram 3: 3-Stage Intrusion Detection Flow inside the Platform */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Cómo detecta intrusiones en esta plataforma
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Flujo completo desde la señal luminosa hasta el análisis SOC e IA.
            </p>

            {/* Simple 3-step visual flow */}
            <div className="mt-4 space-y-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Eye className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>01. Adquisición óptica en tiempo real (25 Hz)</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  El nodo transmite el campo <span className="font-mono">l</span> en cada paquete BLE (o desde el inyector Demo) hacia el osciloscopio del <strong>Monitor SOC</strong> y el <strong>Gemelo 3D</strong>.
                </p>
              </div>

              <div className="flex justify-center" aria-hidden="true">
                <ArrowDown className="h-4 w-4 text-slate-400" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>02. Motor dual: Umbrales + Edge AI (k-NN 16D)</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Las reglas disparan alerta inmediata si <span className="font-mono">l &gt; {thresholds.maxLightCounts}</span> o <span className="font-mono">l &lt; {thresholds.minLightCounts}</span>. En paralelo, el modelo <strong>k-NN</strong> evalúa la media y desviación estándar (<span className="font-mono">stdLight</span>) en ventanas de 30 muestras para identificar ráfagas o inyecciones ópticas.
                </p>
              </div>

              <div className="flex justify-center" aria-hidden="true">
                <ArrowDown className="h-4 w-4 text-slate-400" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span>03. Contención SOC, Matriz 5×5 y Auditoría</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  El evento eleva el índice de amenaza en el gráfico temporal, actualiza el mapa de calor, cambia la matriz LED a alerta y queda trazado en el CSV forense para análisis con Gemini.
                </p>
              </div>
            </div>
          </section>

          {/* 3 Concrete Physical Cybersecurity Scenarios */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Vectores físicos monitoreados
            </h2>
            <div className="mt-3 divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <div className="py-2.5 first:pt-0">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <ArrowRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  Apertura de gabinete (Enclosure Breach)
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Un servidor o controlador industrial sellado mantiene baja luminosidad; abrir la puerta dispara el conteo por encima del umbral máximo.
                </p>
              </div>
              <div className="py-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  Ceguera intencional (Sensor Blinding)
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Cubrir el sensor con cinta opaca cae por debajo de <span className="font-mono">{thresholds.minLightCounts} cuentas</span>, delatando intento de sabotaje previo.
                </p>
              </div>
              <div className="py-2.5 last:pb-0">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <ArrowRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  Canal encubierto óptico (Covert Channel)
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Pulsos rápidos de luz modulan bits sobre el nodo físico (demostrado en el juego <strong>Decodificador Óptico</strong>).
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
