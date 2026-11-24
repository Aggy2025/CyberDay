import { useMemo } from 'react';
import { ArrowRight, Cpu, Download, RotateCcw, Send, ShieldAlert, Trash2 } from 'lucide-react';
import {
  computeAccelMagnitude,
  computeGyroMagnitude,
  exportAlertsToCsv,
  exportAlertsToJson,
  SECURITY_CLASS_META,
} from '../lib/cyberEngine';
import { CYBER_MATRIX_PRESETS } from '../lib/firmwareTemplate';
import { getMakerUseCaseForClass, getMakerUseCaseForScenario } from '../lib/makerApplications';
import type {
  ActiveTab,
  CyberScenario,
  KnnPrediction,
  SecurityAlert,
  SecurityThresholds,
  TelemetryPacket,
  ThreatTrendPoint,
} from '../lib/types';
import { BoardSchematicSvg } from './BoardSchematicSvg';
import { ThreatTrendChart } from './ThreatTrendChart';

interface SocMonitorViewProps {
  latestPacket: TelemetryPacket;
  history: TelemetryPacket[];
  alerts: SecurityAlert[];
  thresholds: SecurityThresholds;
  onChangeThresholds: (next: SecurityThresholds) => void;
  onResetThresholds: () => void;
  onClearAlerts: () => void;
  matrixPixels: number[];
  onToggleMatrixPixel: (index: number) => void;
  onApplyMatrixPreset: (pixels: number[]) => void;
  prediction: KnnPrediction | null;
  threatHistory: ThreatTrendPoint[];
  bleConnected: boolean;
  activeScenario: CyberScenario;
  onNavigateTab: (tab: ActiveTab) => void;
}

export function SocMonitorView({
  latestPacket,
  history,
  alerts,
  thresholds,
  onChangeThresholds,
  onResetThresholds,
  onClearAlerts,
  matrixPixels,
  onToggleMatrixPixel,
  onApplyMatrixPreset,
  prediction,
  threatHistory,
  bleConnected,
  activeScenario,
  onNavigateTab,
}: SocMonitorViewProps) {
  const accelMag = computeAccelMagnitude(latestPacket);
  const accelDelta = Math.abs(accelMag - 1.0);
  const gyroMag = computeGyroMagnitude(latestPacket);

  const activeMakerCase =
    prediction && prediction.isAnomaly
      ? getMakerUseCaseForClass(prediction.predictedClass)
      : getMakerUseCaseForScenario(activeScenario);

  const hasTamperAlert =
    accelDelta > thresholds.maxAccelDeltaG || gyroMag > thresholds.maxGyroDps;
  const hasOpticalAlert =
    latestPacket.l > thresholds.maxLightCounts || latestPacket.l < thresholds.minLightCounts;
  const hasThermalAlert = latestPacket.t > thresholds.maxTempC;

  const chartSeries = useMemo(() => {
    const slice = history.slice(-75);
    if (slice.length < 2) {
      return { accelPath: '', lightPath: '', gyroPath: '' };
    }
    const width = 640;
    const height = 170;
    const stepX = width / Math.max(1, slice.length - 1);

    const toPath = (values: number[], maxVal: number) =>
      values
        .map((val, idx) => {
          const x = idx * stepX;
          const clamped = Math.max(0, Math.min(1, val / maxVal));
          const y = height - clamped * (height - 20) - 10;
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');

    return {
      accelPath: toPath(
        slice.map((p) => Math.abs(computeAccelMagnitude(p) - 1.0)),
        1.5,
      ),
      gyroPath: toPath(
        slice.map((p) => computeGyroMagnitude(p)),
        150,
      ),
      lightPath: toPath(
        slice.map((p) => p.l),
        1000,
      ),
    };
  }, [history]);

  const predictedMeta = prediction ? SECURITY_CLASS_META[prediction.predictedClass] : null;

  const triggerFileDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAlertsCsv = () => {
    if (alerts.length === 0) return;
    triggerFileDownload(
      exportAlertsToCsv(alerts),
      'text/csv;charset=utf-8',
      'alertas-soc-ideasense.csv',
    );
  };

  const handleDownloadAlertsJson = () => {
    if (alerts.length === 0) return;
    triggerFileDownload(
      exportAlertsToJson(alerts),
      'application/json;charset=utf-8',
      'alertas-soc-ideasense.json',
    );
  };

  return (
    <div className="space-y-6">
      {/* Top 4 Telemetry KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Acelerómetro IMU (Δ|a|)</span>
            <span
              className={`font-semibold ${
                hasTamperAlert
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hasTamperAlert ? 'Alerta' : 'Nominal'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {accelDelta.toFixed(3)} <span className="text-sm font-normal text-slate-500">g</span>
          </div>
          <div className="mt-1.5 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            X {latestPacket.ax.toFixed(2)} · Y {latestPacket.ay.toFixed(2)} · Z {latestPacket.az.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Giroscopio (|ω|)</span>
            <span
              className={`font-semibold ${
                gyroMag > thresholds.maxGyroDps
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {gyroMag > thresholds.maxGyroDps ? 'Rotación alta' : 'Estable'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {gyroMag.toFixed(1)} <span className="text-sm font-normal text-slate-500">dps</span>
          </div>
          <div className="mt-1.5 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            X {latestPacket.gx.toFixed(0)} · Y {latestPacket.gy.toFixed(0)} · Z {latestPacket.gz.toFixed(0)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sensor de Luz (LTR-303)</span>
            <span
              className={`font-semibold ${
                hasOpticalAlert
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hasOpticalAlert ? 'Anomalía luz' : 'Sellado'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {latestPacket.l} <span className="text-sm font-normal text-slate-500">cuentas</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Rango seguro: {thresholds.minLightCounts} – {thresholds.maxLightCounts}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Térmico (SHT30) y Botones</span>
            <span
              className={`font-semibold ${
                hasThermalAlert
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hasThermalAlert ? 'Sobrecalentado' : 'Normal'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {latestPacket.t.toFixed(1)} <span className="text-sm font-normal text-slate-500">°C</span>
            <span className="ml-2 text-sm font-normal text-slate-500 tabular-nums">
              / {latestPacket.h.toFixed(0)}% HR
            </span>
          </div>
          <div className="mt-1.5 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Btn A: {latestPacket.ba ? 'ACTIVO' : 'reposo'} · Btn B/C: {latestPacket.bb ? 'ACTIVO' : 'reposo'}
          </div>
        </div>
      </div>

      {/* Main Split: Live Waveform + AI Classification vs Hardware Schematic & 5x5 LED Matrix */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 7 cols: Live Telemetry Waveform & Threshold Tuning */}
        <div className="space-y-6 xl:col-span-7">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Osciloscopio de Telemetría Física (25 Hz)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supervisión simultánea de vibración (IMU), rotación y flujo óptico (LTR-303).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                  Δ|a| (g)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                  Luz (cuentas)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                  Giro (dps)
                </span>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
              {history.length < 2 ? (
                <div className="flex h-44 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                  Inicia el Modo Demo o conecta la IdeaBoard para visualizar la serie temporal en vivo.
                </div>
              ) : (
                <svg
                  viewBox="0 0 640 170"
                  className="h-44 w-full"
                  role="img"
                  aria-label="Gráfico de telemetría en vivo"
                >
                  {[42, 85, 128].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="640"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                    />
                  ))}
                  <path d={chartSeries.lightPath} fill="none" stroke="#f59e0b" strokeWidth="2" />
                  <path d={chartSeries.gyroPath} fill="none" stroke="#f43f5e" strokeWidth="1.75" />
                  <path d={chartSeries.accelPath} fill="none" stroke="#2563eb" strokeWidth="2.25" />
                </svg>
              )}
            </div>

            {/* Live Edge AI summary bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Inferencia Edge AI en vivo (k-NN local)
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span>{predictedMeta ? predictedMeta.name : 'Esperando ventana de 3 muestras...'}</span>
                  {prediction && (
                    <>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 tabular-nums">
                        Confianza {prediction.confidence}%
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Z-máx {prediction.zScoreMax}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {prediction && (
                <span
                  className={`text-xs font-semibold ${
                    prediction.isAnomaly
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {prediction.isAnomaly ? 'Anomalía detectada' : 'Comportamiento nominal'}
                </span>
              )}
            </div>
          </section>

          {/* Threshold Configuration */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Umbrales de Seguridad Física
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ajusta la sensibilidad del nodo para provocar o mitigar alertas en demostraciones.
                </p>
              </div>
              <button
                type="button"
                onClick={onResetThresholds}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Restablecer
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs">
                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                  <span>Umbral vibración Δ|a|</span>
                  <span className="font-mono tabular-nums">{thresholds.maxAccelDeltaG.toFixed(2)} g</span>
                </div>
                <input
                  type="range"
                  min={0.08}
                  max={1.0}
                  step={0.02}
                  value={thresholds.maxAccelDeltaG}
                  onChange={(e) =>
                    onChangeThresholds({
                      ...thresholds,
                      maxAccelDeltaG: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-blue-600"
                />
              </label>

              <label className="block text-xs">
                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                  <span>Umbral rotación giroscopio</span>
                  <span className="font-mono tabular-nums">{thresholds.maxGyroDps} dps</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={140}
                  step={5}
                  value={thresholds.maxGyroDps}
                  onChange={(e) =>
                    onChangeThresholds({
                      ...thresholds,
                      maxGyroDps: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-blue-600"
                />
              </label>

              <label className="block text-xs">
                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                  <span>Luz máxima (apertura gabinete)</span>
                  <span className="font-mono tabular-nums">{thresholds.maxLightCounts} cuentas</span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={950}
                  step={10}
                  value={thresholds.maxLightCounts}
                  onChange={(e) =>
                    onChangeThresholds({
                      ...thresholds,
                      maxLightCounts: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-blue-600"
                />
              </label>

              <label className="block text-xs">
                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                  <span>Temperatura máxima hardware</span>
                  <span className="font-mono tabular-nums">{thresholds.maxTempC.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min={27.0}
                  max={45.0}
                  step={0.5}
                  value={thresholds.maxTempC}
                  onChange={(e) =>
                    onChangeThresholds({
                      ...thresholds,
                      maxTempC: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-blue-600"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Right 5 cols: Hardware Schematic + 5x5 Matrix + Security Event Feed */}
        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Gemelo de Hardware y Matriz LED 5×5
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Visualización en vivo de sensores y control de la matriz LED ({bleConnected ? 'sincronizada por BLE' : 'vista previa local'}).
            </p>

            <div className="mt-4">
              <BoardSchematicSvg
                packet={latestPacket}
                matrixPixels={matrixPixels}
                hasTamperAlert={hasTamperAlert}
                hasOpticalAlert={hasOpticalAlert}
                hasThermalAlert={hasThermalAlert}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Editor táctil 5×5
                </div>
                <div
                  className="grid w-fit grid-cols-5 gap-1.5 rounded-lg border border-slate-200 bg-slate-900 p-2.5 dark:border-slate-700"
                  role="group"
                  aria-label="Matriz LED 5 por 5"
                >
                  {matrixPixels.slice(0, 25).map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onToggleMatrixPixel(idx)}
                      aria-label={`LED fila ${Math.floor(idx / 5) + 1} columna ${(idx % 5) + 1} ${val ? 'encendido' : 'apagado'}`}
                      aria-pressed={val === 1}
                      className={`h-7 w-7 rounded transition-colors ${
                        val === 1
                          ? hasTamperAlert || hasThermalAlert
                            ? 'bg-red-500 hover:bg-red-400'
                            : 'bg-sky-400 hover:bg-sky-300'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Patrones de ciberseguridad
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {CYBER_MATRIX_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyMatrixPreset(preset.pixels)}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span className="truncate">{preset.name}</span>
                      <Send className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Registro de Alertas SOC
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadAlertsCsv}
                  disabled={alerts.length === 0}
                  aria-label="Descargar alertas en CSV"
                  title="Descargar historial de alertas en formato CSV"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAlertsJson}
                  disabled={alerts.length === 0}
                  aria-label="Descargar alertas en JSON"
                  title="Descargar historial de alertas en formato JSON"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  JSON
                </button>
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAlerts}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Sin incidentes activos. Cambia el escenario o agita/ilumina la tarjeta para disparar alertas.
                </p>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-semibold ${
                          al.severity === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {al.title}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {new Date(al.ts).toLocaleTimeString('es-CR', { hour12: false })}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{al.detail}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Vector: {al.vectorTag}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Recharts Temporal AI Threat Level Trend */}
      <ThreatTrendChart data={threatHistory} />

      {/* Real-World MakerLab Application Context */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Aplicación real en MakerLab de lo observado en el Monitor SOC"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Enfoque MakerLab · Aplicación Real
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeMakerCase.sensorTitle}</span>
            </div>
            <h2 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {activeMakerCase.realWorldTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('optical')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Ver circuito del sensor
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('ailab')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              Entrenar modelo k-NN
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              ¿Qué protege en el mundo real?
            </div>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
              {activeMakerCase.sectorContext}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Acción autónoma del microcontrolador
            </div>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
              {activeMakerCase.microcontrollerRole}
            </p>
          </div>
          <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Reto replicable en el MakerLab
            </div>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
              {activeMakerCase.makerLabProject}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
