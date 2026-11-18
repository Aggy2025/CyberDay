import { useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Copy, Database, Download, Play, RotateCcw, Trash2 } from 'lucide-react';
import {
  extractFeatureVector,
  generateCircuitPythonClassifier,
  SECURITY_CLASS_META,
} from '../lib/cyberEngine';
import type { KnnPrediction, KnnSample, SecurityClassId, TelemetryPacket } from '../lib/types';

interface AiLabViewProps {
  history: TelemetryPacket[];
  dataset: KnnSample[];
  onAddSample: (sample: KnnSample) => void;
  onDeleteSample: (id: string) => void;
  onResetBaseline: () => void;
  onClearDataset: () => void;
  prediction: KnnPrediction | null;
  kNeighbors: number;
  onChangeK: (k: number) => void;
  telemetryActive: boolean;
}

const CLASS_ORDER: SecurityClassId[] = [
  'normal',
  'tampering',
  'optical_breach',
  'side_channel',
];

export function AiLabView({
  history,
  dataset,
  onAddSample,
  onDeleteSample,
  onResetBaseline,
  onClearDataset,
  prediction,
  kNeighbors,
  onChangeK,
  telemetryActive,
}: AiLabViewProps) {
  const [targetClass, setTargetClass] = useState<SecurityClassId>('tampering');
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [showPythonModal, setShowPythonModal] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);

  const captureBufferRef = useRef<TelemetryPacket[]>([]);
  const latestHistoryRef = useRef<TelemetryPacket[]>(history);
  latestHistoryRef.current = history;

  useEffect(() => {
    if (!capturing) return;
    captureBufferRef.current = [];
    setCaptureProgress(0);

    const startTime = Date.now();
    const durationMs = 3000;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setCaptureProgress(pct);

      const latest = latestHistoryRef.current[latestHistoryRef.current.length - 1];
      if (latest) {
        const lastBuf = captureBufferRef.current[captureBufferRef.current.length - 1];
        if (!lastBuf || lastBuf.ts !== latest.ts) {
          captureBufferRef.current.push(latest);
        }
      }

      if (elapsed >= durationMs) {
        window.clearInterval(timer);
        const burst =
          captureBufferRef.current.length >= 5
            ? captureBufferRef.current
            : latestHistoryRef.current.slice(-25);

        if (burst.length >= 3) {
          onAddSample({
            id: `cap-${Date.now()}`,
            label: targetClass,
            source: 'captured',
            createdAt: Date.now(),
            features: extractFeatureVector(burst),
          });
        }
        setCapturing(false);
        setCaptureProgress(0);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [capturing, targetClass, onAddSample]);

  const countsByClass = useMemo(() => {
    const counts: Record<SecurityClassId, number> = {
      normal: 0,
      tampering: 0,
      optical_breach: 0,
      side_channel: 0,
    };
    for (const s of dataset) counts[s.label]++;
    return counts;
  }, [dataset]);

  const liveVector = useMemo(() => {
    const win = history.slice(-30);
    return win.length >= 3 ? extractFeatureVector(win) : null;
  }, [history]);

  const pythonCode = useMemo(() => generateCircuitPythonClassifier(dataset), [dataset]);

  const handleCopyPython = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopiedPy(true);
      setTimeout(() => setCopiedPy(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownloadPython = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideasense_cyber_knn.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const predMeta = prediction ? SECURITY_CLASS_META[prediction.predictedClass] : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: Live Classifier + 3s Burst Recorder */}
        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Inferencia Edge AI en Tiempo Real
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clasificación k-NN sobre ventana móvil de 16 características (media y desviación estándar de IMU, luz y temperatura).
            </p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              {prediction && predMeta ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Clase predicha ({prediction.neighborsCount}-NN)
                      </div>
                      <div
                        className={`mt-1 font-display text-xl font-bold ${
                          prediction.isAnomaly
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {predMeta.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Confianza</div>
                      <div className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {prediction.confidence}%
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{predMeta.description}</p>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 font-mono text-xs dark:border-slate-800">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Dist. euclidiana: </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {prediction.minDistance}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Z-score máx.: </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {prediction.zScoreMax} σ
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {dataset.length === 0
                    ? 'El dataset está vacío. Carga el dataset base o captura muestras para activar la inferencia.'
                    : 'Activa el Modo Demo o conecta la placa para alimentar la ventana de inferencia.'}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
              <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <span>Vecinos (k):</span>
                <select
                  value={kNeighbors}
                  onChange={(e) => onChangeK(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={1}>k = 1</option>
                  <option value={3}>k = 3</option>
                  <option value={5}>k = 5</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setShowPythonModal((prev) => !prev)}
                disabled={dataset.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 whitespace-nowrap"
              >
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                Exportar a Python (.py)
              </button>
            </div>
          </section>

          {/* 3-Second Burst Recorder */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Entrenamiento: Capturar Ráfaga (3 s)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Graba 3 segundos de telemetría física para enseñar al modelo una nueva firma de ataque o estado seguro.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Clase objetivo de seguridad
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value as SecurityClassId)}
                  disabled={capturing}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {CLASS_ORDER.map((cls) => (
                    <option key={cls} value={cls}>
                      {SECURITY_CLASS_META[cls].name}
                    </option>
                  ))}
                </select>
              </label>

              {capturing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Capturando ráfaga de sensores...</span>
                    <span className="font-mono tabular-nums">{captureProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-blue-600 transition-all duration-100"
                      style={{ width: `${captureProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={capturing || !telemetryActive}
                onClick={() => setCapturing(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {capturing
                  ? 'Grabando muestra (3 s)...'
                  : telemetryActive
                    ? 'Capturar Ráfaga de 3 Segundos'
                    : 'Activa Demo o BLE para capturar'}
              </button>
            </div>
          </section>
        </div>

        {/* Right: Dataset Manager & 16-D Feature Vector Inspector */}
        <div className="space-y-6 xl:col-span-7">
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Dataset de Firmas Físicas ({dataset.length} muestras)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Muestras almacenadas localmente en el navegador para clasificación en el borde.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResetBaseline}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Cargar dataset base
                </button>
                <button
                  type="button"
                  onClick={onClearDataset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Vaciar
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CLASS_ORDER.map((cls) => (
                <div
                  key={cls}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                    {SECURITY_CLASS_META[cls].name}
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {countsByClass[cls]}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
              {dataset.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                  <Database className="h-5 w-5" aria-hidden="true" />
                  <span>Sin muestras de entrenamiento.</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Clase</th>
                      <th className="px-3 py-2 font-medium">Origen</th>
                      <th className="px-3 py-2 font-medium">μ(Az) · μ(Luz) · σ(Gx)</th>
                      <th className="px-3 py-2 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {dataset.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                          {SECURITY_CLASS_META[s.label].name}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          {s.source === 'baseline' ? 'Base demo' : 'Capturada'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                          {s.features[2]?.toFixed(2)}g · {Math.round((s.features[6] ?? 0) * 1000)} · {(s.features[11] ?? 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteSample(s.id)}
                            aria-label={`Eliminar muestra ${s.id}`}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 16-D Feature Vector Live View */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Vector de Características en Vivo (16D)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Medias (μ) y desviaciones estándar (σ) extraídas de los últimos 30 paquetes antes de calcular la distancia k-NN.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-xs sm:grid-cols-8">
              {[
                'μAx', 'μAy', 'μAz', 'μGx', 'μGy', 'μGz', 'μLuz', 'μTmp',
                'σAx', 'σAy', 'σAz', 'σGx', 'σGy', 'σGz', 'σLuz', 'σTmp',
              ].map((label, idx) => (
                <div
                  key={label}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {liveVector ? liveVector[idx].toFixed(2) : '0.00'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Exported CircuitPython Model Code */}
      {showPythonModal && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Modelo Edge AI Exportado para CircuitPython
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guarda este archivo como <code className="font-mono">ideasense_cyber_knn.py</code> en tu IdeaBoard para ejecutar clasificación local sin conexión.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPython}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copiedPy ? 'Copiado' : 'Copiar código'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPython}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Descargar .py
              </button>
            </div>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200">
            {pythonCode}
          </pre>
        </section>
      )}
    </div>
  );
}
