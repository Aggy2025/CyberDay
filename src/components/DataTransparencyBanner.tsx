import { AlertTriangle, CheckCircle2, Info, Radio } from 'lucide-react';
import { SCENARIO_META } from '../lib/cyberEngine';
import type { ConnectionMode, CyberScenario, DataOriginLabel } from '../lib/types';

interface DataTransparencyBannerProps {
  connectionMode: ConnectionMode;
  dataOrigin: DataOriginLabel;
  activeScenario: CyberScenario;
  onChangeScenario: (scenario: CyberScenario) => void;
  bleError: string | null;
}

const SCENARIO_ORDER: CyberScenario[] = [
  'normal',
  'tampering',
  'optical_breach',
  'thermal_attack',
  'brute_force',
];

export function DataTransparencyBanner({
  connectionMode,
  dataOrigin,
  activeScenario,
  onChangeScenario,
  bleError,
}: DataTransparencyBannerProps) {
  return (
    <div className="space-y-3">
      {bleError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <span>{bleError}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-2.5 text-xs">
          {dataOrigin === 'REAL_BLE' && (
            <>
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Lecturas reales por BLE
                </span>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300">
                  Todos los sensores físicos de la IdeaSense Explorer (IMU, SHT30, LTR-303) están respondiendo.
                </span>
              </div>
            </>
          )}
          {dataOrigin === 'FIRMWARE_SIMULADO' && (
            <>
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  Sensor no detectado en placa
                </span>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300">
                  El firmware informó mediante el campo <code className="font-mono">sim</code> que uno o más canales I2C son simulados.
                </span>
              </div>
            </>
          )}
          {dataOrigin === 'DEMO_SIMULADO' && (
            <>
              <Radio
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  Modo Simulación (Demo)
                </span>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300">
                  Datos generados en el navegador para demostración; no provienen de hardware físico.
                </span>
              </div>
            </>
          )}
          {connectionMode === 'disconnected' && (
            <>
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  En espera de telemetría
                </span>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300">
                  Conecta tu IdeaBoard por Bluetooth o activa el Modo Demo para simular ataques físicos en tiempo real.
                </span>
              </div>
            </>
          )}
        </div>

        {connectionMode === 'demo' && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0" role="group" aria-label="Inyector de escenarios físicos">
            <span className="mr-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Escenario:
            </span>
            {SCENARIO_ORDER.map((sc) => {
              const active = activeScenario === sc;
              const compactLabel =
                sc === 'normal'
                  ? 'Normal'
                  : sc === 'tampering'
                    ? 'Sabotaje Físico'
                    : sc === 'optical_breach'
                      ? 'Intrusión Óptica'
                      : sc === 'thermal_attack'
                        ? 'Anomalía Térmica'
                        : 'Fuerza Bruta';
              return (
                <button
                  key={sc}
                  type="button"
                  title={SCENARIO_META[sc].shortDesc}
                  onClick={() => onChangeScenario(sc)}
                  aria-pressed={active}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? sc === 'normal'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {compactLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
