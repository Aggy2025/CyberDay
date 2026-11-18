import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Play,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { computeAccelMagnitude, exportAuditToCsv } from '../lib/cyberEngine';
import type {
  AuditRow,
  DataOriginLabel,
  GeminiIncidentAnalysis,
  KnnPrediction,
  SecurityAlert,
  TelemetryPacket,
} from '../lib/types';

interface AuditCopilotViewProps {
  latestPacket: TelemetryPacket;
  history: TelemetryPacket[];
  dataOrigin: DataOriginLabel;
  prediction: KnnPrediction | null;
  alerts: SecurityAlert[];
  telemetryActive: boolean;
}

export function AuditCopilotView({
  latestPacket,
  history,
  dataOrigin,
  prediction,
  alerts,
  telemetryActive,
}: AuditCopilotViewProps) {
  const [recording, setRecording] = useState(false);
  const [auditName, setAuditName] = useState('auditoria_dia_cybersec');
  const [auditNote, setAuditNote] = useState('Prueba de detección física');
  const [rows, setRows] = useState<AuditRow[]>([]);

  const [question, setQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiIncidentAnalysis | null>(null);

  const latestRef = useRef(latestPacket);
  const originRef = useRef(dataOrigin);
  const predRef = useRef(prediction);
  const noteRef = useRef(auditNote);
  const startTsRef = useRef<number>(Date.now());

  latestRef.current = latestPacket;
  originRef.current = dataOrigin;
  predRef.current = prediction;
  noteRef.current = auditNote;

  useEffect(() => {
    if (!recording) return;
    startTsRef.current = Date.now();
    const timer = window.setInterval(() => {
      const p = latestRef.current;
      const elapsedSec = (Date.now() - startTsRef.current) / 1000;
      setRows((prev) => [
        ...prev,
        {
          isoTime: new Date().toISOString(),
          elapsedSec,
          origenDatos: originRef.current,
          t: p.t,
          h: p.h,
          l: p.l,
          ax: p.ax,
          ay: p.ay,
          az: p.az,
          gx: p.gx,
          gy: p.gy,
          gz: p.gz,
          ba: p.ba,
          bb: p.bb,
          predictedClass: predRef.current?.predictedClass ?? 'sin_modelo',
          anomalyDistance: predRef.current?.minDistance ?? 0,
          note: noteRef.current,
        },
      ]);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const csv = exportAuditToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${auditName.trim() || 'auditoria_cybersec'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeWithGemini = async () => {
    setAnalyzing(true);
    setAnalysisError(null);

    const win = history.length > 0 ? history.slice(-40) : [latestPacket];
    const temps = win.map((p) => p.t);
    const lights = win.map((p) => p.l);
    const accels = win.map((p) => Math.abs(computeAccelMagnitude(p) - 1.0));

    const summaryStats = {
      muestrasEnVentana: win.length,
      tempMinC: Math.min(...temps),
      tempMaxC: Math.max(...temps),
      luzMin: Math.min(...lights),
      luzMax: Math.max(...lights),
      vibracionMaxDeltaG: Number(Math.max(...accels).toFixed(3)),
      ultimaLectura: latestPacket,
      filasAuditadasCsv: rows.length,
    };

    try {
      const resp = await fetch('/api/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryStats,
          recentAlerts: alerts.slice(0, 6),
          knnPrediction: prediction,
          dataOrigin,
          userQuestion: question.trim() || undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setAnalysisError(json.error || 'No se pudo completar el análisis.');
      } else {
        setAnalysis(json.analysis);
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Error de red al conectar con el servidor.',
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left: Experiment & CSV Logger */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Registro de Auditoría y Exportación CSV
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Graba 1 muestra/s con etiqueta <code className="font-mono">origen_datos</code> y clasificación k-NN.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {rows.length} filas
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Nombre del archivo
            <input
              type="text"
              value={auditName}
              onChange={(e) => setAuditName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Anotación de incidente
            <input
              type="text"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRecording((r) => !r)}
            disabled={!recording && !telemetryActive}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
              recording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {recording ? (
              <>
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                Detener Registro
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Grabar Auditoría (1 Hz)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Exportar CSV
          </button>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => setRows([])}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar tabla
            </button>
          )}
        </div>

        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Pulsa &quot;Grabar Auditoría (1 Hz)&quot; para capturar evidencia forense exportable a Excel o Python.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-2.5 py-2">t (s)</th>
                  <th className="px-2.5 py-2">Origen</th>
                  <th className="px-2.5 py-2">Luz</th>
                  <th className="px-2.5 py-2">Temp</th>
                  <th className="px-2.5 py-2">Clase IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.slice(-25).reverse().map((r, idx) => (
                  <tr key={`${r.isoTime}-${idx}`}>
                    <td className="px-2.5 py-1.5 tabular-nums">{r.elapsedSec.toFixed(1)}</td>
                    <td className="px-2.5 py-1.5 text-[11px]">{r.origenDatos}</td>
                    <td className="px-2.5 py-1.5 tabular-nums">{r.l}</td>
                    <td className="px-2.5 py-1.5 tabular-nums">{r.t.toFixed(1)}°C</td>
                    <td className="px-2.5 py-1.5">{r.predictedClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Right: Gemini Cybersecurity Incident Copilot */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Copiloto de Incidentes IoT (Gemini AI)
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Envía la ventana de telemetría actual, alertas y predicción k-NN al servidor para generar un dictamen técnico de ciberseguridad y mitigación en CircuitPython.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Consulta o hipótesis para el análisis (opcional)
            <textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: ¿Este patrón de luz y vibración corresponde a apertura de gabinete o canal encubierto?"
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={handleAnalyzeWithGemini}
            disabled={analyzing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {analyzing ? 'Analizando telemetría con Gemini...' : 'Analizar Incidente con Gemini'}
          </button>
        </div>

        {analysisError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>{analysisError}</span>
          </div>
        )}

        {analysis ? (
          <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Vector: {analysis.vectorAtaque}
              </span>
              <span
                className={`font-semibold ${
                  analysis.nivelRiesgo === 'Crítico' || analysis.nivelRiesgo === 'Alto'
                    ? 'text-red-600 dark:text-red-400'
                    : analysis.nivelRiesgo === 'Medio'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                Riesgo: {analysis.nivelRiesgo}
              </span>
            </div>

            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              {analysis.resumenEjecutivo}
            </p>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Indicadores observados
              </h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
                {analysis.indicadoresClave.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Acciones de mitigación
              </h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
                {analysis.accionesMitigacion.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Regla sugerida en CircuitPython
              </h3>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
                {analysis.reglaDeteccionPython}
              </pre>
            </div>
          </div>
        ) : (
          !analysisError && (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Activa un escenario de ataque o realiza una prueba física y pulsa &quot;Analizar Incidente con Gemini&quot; para obtener el informe forense.
            </div>
          )
        )}
      </section>
    </div>
  );
}
