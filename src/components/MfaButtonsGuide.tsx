import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Cpu,
  Gamepad2,
  KeyRound,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { computeMfaLessonMetrics } from '../lib/sensorsEducation';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';

interface MfaButtonsGuideProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
}

export function MfaButtonsGuide({
  latestPacket,
  thresholds,
  telemetryActive,
}: MfaButtonsGuideProps) {
  const [followLive, setFollowLive] = useState(false);
  const [manualPresses, setManualPresses] = useState(1);
  const [lastButton, setLastButton] = useState<'A' | 'B/C' | 'Ráfaga'>('A');

  const livePressCount = latestPacket.ba + latestPacket.bb;
  const activeCount = followLive ? (livePressCount > 0 ? Math.max(2, livePressCount * 3) : 0) : manualPresses;

  const metrics = useMemo(
    () => computeMfaLessonMetrics(activeCount, thresholds),
    [activeCount, thresholds],
  );

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
  const isSwitchClosed = followLive ? latestPacket.ba === 1 || latestPacket.bb === 1 : manualPresses > 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12" data-testid="mfa-buttons-guide">
      <div className="space-y-6 xl:col-span-7">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Diagrama 1. Principio Pull-Up y Keyscan HT16K33 (Botones A, B y C)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Simula pulsaciones físicas para ver cómo el controlador HT16K33 (0x70) y el ESP32 detectan flancos y ráfagas de fuerza bruta.
              </p>
            </div>

            <div
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Fuente de lectura botones MFA"
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFollowLive(false);
                  setLastButton('A');
                  setManualPresses((c) => Math.min(12, c + 1));
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Pulsar Botón A (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowLive(false);
                  setLastButton('B/C');
                  setManualPresses((c) => Math.min(12, c + 1));
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Pulsar Botón B/C (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowLive(false);
                  setLastButton('Ráfaga');
                  setManualPresses(thresholds.maxButtonBurst + 1);
                }}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 whitespace-nowrap shrink-0"
              >
                Simular ráfaga fuerza bruta
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFollowLive(false);
                setManualPresses(0);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reiniciar ventana
            </button>
          </div>

          {/* Interactive SVG Pull-Up & Keyscan Schematic */}
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-3 dark:border-slate-800">
            <svg
              viewBox="0 0 600 205"
              className="h-auto w-full"
              role="img"
              aria-label="Diagrama de circuito Pull-Up y lectura por HT16K33 para botones físicos A, B y C hacia ESP32"
            >
              {/* Vcc */}
              <line x1="90" y1="26" x2="150" y2="26" stroke="#38bdf8" strokeWidth="2" />
              <text x="120" y="18" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                3.3 V (Pull-Up)
              </text>
              <line x1="120" y1="26" x2="120" y2="46" stroke="#94a3b8" strokeWidth="2" />
              {/* Pull-up resistor */}
              <path
                d="M 120 46 L 112 51 L 128 57 L 112 63 L 128 69 L 112 75 L 120 80"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.8"
              />
              <text x="140" y="66" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono, monospace">
                10 kΩ
              </text>

              {/* Node to HT16K33 / ESP32 */}
              <line x1="120" y1="80" x2="120" y2="124" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="120" cy="102" r="4.5" fill="#38bdf8" />
              <line x1="120" y1="102" x2="302" y2="102" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" />
              <polygon points="307,102 298,98 298,106" fill="#38bdf8" />
              <text x="214" y="92" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="JetBrains Mono, monospace">
                {followLive
                  ? `ba=${latestPacket.ba} · bb=${latestPacket.bb}`
                  : `${metrics.burstCount} flancos · ${lastButton}`}
              </text>

              {/* Tactile switch */}
              <circle cx="120" cy="126" r="3" fill="#f8fafc" />
              <circle cx="120" cy="156" r="3" fill="#f8fafc" />
              <line
                x1="120"
                y1="126"
                x2={isSwitchClosed ? '120' : '142'}
                y2="154"
                stroke={isSwitchClosed ? '#38bdf8' : '#fbbf24'}
                strokeWidth="2.4"
              />
              <text x="148" y="145" fill="#cbd5e1" fontSize="10" fontFamily="DM Sans, sans-serif">
                Switch A / B / C
              </text>

              {/* GND */}
              <line x1="120" y1="156" x2="120" y2="174" stroke="#94a3b8" strokeWidth="2" />
              <line x1="106" y1="174" x2="134" y2="174" stroke="#94a3b8" strokeWidth="2" />
              <line x1="112" y1="180" x2="128" y2="180" stroke="#94a3b8" strokeWidth="1.6" />

              {/* MCU edge counter box */}
              <rect x="312" y="34" width="272" height="142" rx="10" fill="#0f172a" stroke={statusVisual.strokeHex} strokeWidth="1.8" />
              <text x="448" y="60" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                HT16K33 (0x70) → ESP32 (25 Hz)
              </text>
              <text x="448" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="DM Sans, sans-serif">
                Ventana móvil de 3 s · Umbral ≥ {metrics.maxBurst} pulsaciones
              </text>

              <rect x="332" y="96" width="232" height="24" rx="5" fill="#1e293b" />
              <rect
                x="332"
                y="96"
                width={Math.round((metrics.ratioPct / 100) * 232)}
                height="24"
                rx="5"
                fill={statusVisual.strokeHex}
              />
              <text x="448" y="112" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {metrics.burstCount} / {metrics.maxBurst} flancos ({metrics.ratioPct}%)
              </text>

              <text x="448" y="152" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="DM Sans, sans-serif" fontWeight="600">
                {metrics.statusLabel} {followLive && telemetryActive ? '· en vivo' : ''}
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
                  {metrics.burstCount} pulsaciones en 3 s (límite {metrics.maxBurst})
                </span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{metrics.securityMeaning}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Right 5 cols */}
      <div className="space-y-6 xl:col-span-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              ¿Cómo funcionan los Botones A, B y C como sensor MFA?
            </h2>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              La IdeaSense Explorer integra tres pulsadores físicos (<strong className="text-slate-900 dark:text-slate-100">A, B y C</strong>) escaneados por el controlador <span className="font-mono">HT16K33</span> (<span className="font-mono">0x70</span>) sobre el bus I2C (accesibles en CircuitPython mediante <span className="font-mono">idea.held</span>). Para mantener un paquete BLE compacto, <span className="font-mono">code.py</span> envía el botón <strong>A</strong> en <span className="font-mono">ba</span> y agrupa <strong>B o C</strong> en <span className="font-mono">bb</span>.
            </p>
            <p>
              En ciberseguridad física, estos botones verifican la <strong>presencia humana local</strong> (autenticación de segundo factor en hardware) y permiten detectar intentos de fuerza bruta cuando alguien presiona repetidamente buscando desbloquear el nodo.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Integración en Monitor SOC y Juegos CyberLab
          </h2>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Cpu className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span>01. Auditoría de Fuerza Bruta (Ventana 3 s)</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Si superan {metrics.maxBurst} flancos ascendentes en 3 segundos, se dispara una alerta crítica <em>Fuerza Bruta Física</em> en el Monitor SOC.
              </p>
            </div>
            <div className="flex justify-center" aria-hidden="true">
              <ArrowDown className="h-4 w-4 text-slate-400" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Gamepad2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>02. Gamepad físico en tiempo real</span>
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Controlan el escudo en <strong>Firewall Interceptor</strong>, la captura de bits en <strong>Decodificador Óptico</strong> y la rotación de llaves en <strong>Defensa MFA</strong>.
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
              <ArrowRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Escenario Fuerza Bruta en Demo
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Selecciona <strong>Fuerza Bruta</strong> arriba para generar ráfagas simuladas en A/B y observar el conteo automático.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
