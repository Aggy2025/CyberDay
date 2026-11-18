import { useState } from 'react';
import { Copy, Download, Terminal } from 'lucide-react';
import { CYBER_FIRMWARE_CODE_PY } from '../lib/firmwareTemplate';

const DEMO_SCRIPT_STEPS = [
  {
    step: '01. Línea base nominal',
    detail:
      'Conecta la IdeaBoard por Bluetooth (o inicia el Modo Demo en Operación Normal). Muestra la matriz 5×5 con el ícono de Escudo y la firma de reposo en el osciloscopio.',
  },
  {
    step: '02. Sabotaje físico (Hardware Tampering)',
    detail:
      'Agita o inclina la tarjeta (o selecciona Sabotaje Físico). Observa cómo el IMU supera Δ|a| y |ω|, dispara una alerta crítica en el registro SOC y cambia la matriz LED a alerta.',
  },
  {
    step: '03. Intrusión óptica y canal encubierto',
    detail:
      'Alumbra el sensor LTR-303 con una linterna o tápalo (o activa Intrusión Óptica). Explica cómo se detecta la apertura no autorizada de un gabinete de red o inyección óptica.',
  },
  {
    step: '04. Entrenamiento Edge AI (k-NN)',
    detail:
      'En Laboratorio IA, captura una ráfaga de 3 segundos de un gesto o ataque, valida la clasificación en vivo por distancia euclidiana y descarga el modelo en Python (.py).',
  },
  {
    step: '05. Reto interactivo Firewall 2D',
    detail:
      'Invita al público a usar los botones físicos A y B de la tarjeta para bloquear paquetes DDoS/Phishing sin interrumpir el tráfico TLS legítimo.',
  },
  {
    step: '06. Auditoría forense y análisis con Gemini',
    detail:
      'Graba 15 segundos de evidencia en Auditoría, exporta el CSV con trazabilidad de origen_datos y genera un informe de mitigación con el Copiloto Gemini.',
  },
];

export function FirmwareGuideView() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CYBER_FIRMWARE_CODE_PY);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownload = () => {
    const blob = new Blob([CYBER_FIRMWARE_CODE_PY], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Firmware CircuitPython (code.py)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compatible con IdeaBoard ESP32 + IdeaSense Explorer y protocolo Web Bluetooth NUS (25 Hz).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Descargar code.py
            </button>
          </div>
        </div>

        <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
          {CYBER_FIRMWARE_CODE_PY}
        </pre>
      </section>

      <section className="space-y-4 xl:col-span-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Guión de Demostración · Día de AI &amp; Cybersecurity
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Secuencia sugerida para charlas, stands universitarios o talleres prácticos en Universidad CENFOTEC.
          </p>

          <ol className="mt-4 space-y-3">
            {DEMO_SCRIPT_STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                  {item.step}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
