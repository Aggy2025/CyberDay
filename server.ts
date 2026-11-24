import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type FreeModelId = 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';

function isTransientDemandError(err: unknown): boolean {
  const status = (err as { status?: number; code?: number } | null)?.status ?? (err as { code?: number } | null)?.code;
  if (status === 503 || status === 429) return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /503|UNAVAILABLE|high demand|overloaded|429|RESOURCE_EXHAUSTED|TIMEOUT/i.test(msg);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT: model response exceeded window')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function runWithFreeModelFallback<T>(
  preferred: FreeModelId,
  runner: (model: FreeModelId) => Promise<T>,
): Promise<{ result: T; usedModel: FreeModelId }> {
  const alternate: FreeModelId =
    preferred === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  try {
    const result = await withTimeout(runner(preferred), 15000);
    return { result, usedModel: preferred };
  } catch (err) {
    if (!isTransientDemandError(err)) throw err;
    console.warn(`[Gemini Fallback] ${preferred} temporalmente saturado; intentando con ${alternate}.`);
    const result = await runner(alternate);
    return { result, usedModel: alternate };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ideasense-cybersecurity-explorer' });
  });

  app.post('/api/analyze-incident', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'No hay una clave GEMINI_API_KEY configurada en Secrets. Configúrela en el panel Settings > Secrets para habilitar el análisis con Gemini.',
      });
      return;
    }

    const { summaryStats, recentAlerts, knnPrediction, dataOrigin, userQuestion } = req.body ?? {};
    if (!summaryStats) {
      res.status(400).json({ error: 'Se requiere summaryStats para analizar el incidente.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `
Eres un especialista en Ciberseguridad IoT, Seguridad Física de Hardware y Edge AI para el evento "Día de AI & Cybersecurity" de la Universidad CENFOTEC.
Analiza la siguiente ventana de telemetría de la placa IdeaBoard (ESP32) + IdeaSense Explorer (IMU LSM6DS, Temp/Hum SHT30, Luz LTR-303, Botones físicos A/B):

Origen de los datos: ${dataOrigin || 'No especificado'}
Estadísticas de la ventana reciente:
${JSON.stringify(summaryStats, null, 2)}

Clasificación Edge AI (k-NN local en el navegador):
${JSON.stringify(knnPrediction || { status: 'Sin modelo activo' }, null, 2)}

Alertas recientes detectadas por reglas de umbral:
${JSON.stringify(recentAlerts || [], null, 2)}

Pregunta adicional del estudiante / analista:
${userQuestion || 'Evalúa si existe un incidente físico, de canal lateral o de intrusión óptica y recomienda mitigaciones prácticas en hardware/firmware.'}

Responde en español técnico, claro y didáctico para estudiantes universitarios de ciberseguridad e IA.
      `.trim();

      const { result: response, usedModel } = await runWithFreeModelFallback(
        'gemini-3.1-flash-lite',
        (modelName) =>
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction:
                'Devuelve estrictamente JSON válido conforme al esquema solicitado. Sé preciso con las magnitudes físicas observadas (g, dps, cuentas de luz, °C) y propón código CircuitPython realista para la librería ideasense.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  resumenEjecutivo: {
                    type: Type.STRING,
                    description: 'Diagnóstico conciso del comportamiento físico y cibernético observado.',
                  },
                  nivelRiesgo: {
                    type: Type.STRING,
                    description: 'Debe ser exactamente uno de: Bajo, Medio, Alto, Crítico',
                  },
                  vectorAtaque: {
                    type: Type.STRING,
                    description: 'Vector probable (ej. Hardware Tampering, Canal Encubierto Óptico, Fuerza Bruta Física, Operación Nominal).',
                  },
                  indicadoresClave: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Lista de 3 a 4 evidencias concretas tomadas de la telemetría.',
                  },
                  accionesMitigacion: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Lista de 3 a 4 contramedidas técnicas aplicables en firmware, cifrado o seguridad física.',
                  },
                  reglaDeteccionPython: {
                    type: Type.STRING,
                    description: 'Fragmento corto en CircuitPython para detectar o mitigar este patrón en la IdeaBoard.',
                  },
                },
                required: [
                  'resumenEjecutivo',
                  'nivelRiesgo',
                  'vectorAtaque',
                  'indicadoresClave',
                  'accionesMitigacion',
                  'reglaDeteccionPython',
                ],
              },
            },
          }),
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ analysis: parsed, model: usedModel });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al consultar Gemini.';
      console.error('[Gemini Analyze Error]', message);
      res.status(502).json({
        error: `No se pudo completar el análisis con Gemini: ${message}`,
      });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'No hay una clave GEMINI_API_KEY configurada en Secrets. Configúrela en el panel Settings > Secrets para usar el chat gratuito.',
      });
      return;
    }

    const { messages, model, roleId, telemetryContext } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Se requiere el historial de mensajes.' });
      return;
    }

    const allowedModels = new Set<FreeModelId>(['gemini-3.1-flash-lite', 'gemini-4-hydrogen']);
    const selectedModel: FreeModelId = allowedModels.has(model) ? model : 'gemini-3.1-flash-lite';

    const roleInstructions: Record<string, string> = {
      soc_analyst:
        'Eres un Analista SOC especialista en seguridad física IoT y hardware embebido (ESP32 IdeaBoard + IdeaSense Explorer). Interpreta alertas de IMU, LTR-303, SHT30 y botones A/B usando criterios de MITRE ATT&CK / OWASP IoT en español técnico y conciso.',
      iot_architect:
        'Eres un Ingeniero de Firmware CircuitPython y Edge AI. Ayudas a escribir reglas de detección en tiempo real, hardening BLE NUS y clasificadores k-NN eficientes para ESP32 en español.',
      workshop_mentor:
        'Eres un Mentor del Día de AI & Cybersecurity en la Universidad CENFOTEC. Explicas conceptos de ataques físicos, canales encubiertos ópticos y modelos k-NN de forma didáctica y práctica en español.',
    };

    const baseInstruction = roleInstructions[roleId] ?? roleInstructions.soc_analyst;
    const systemInstruction = telemetryContext
      ? `${baseInstruction}\n\nContexto actual de telemetría de la placa:\n${JSON.stringify(telemetryContext)}`
      : baseInstruction;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const historyTurns = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.text ?? '') }],
      }));
      const latestUserMessage = String(messages[messages.length - 1]?.text ?? '');

      const { result: response, usedModel } = await runWithFreeModelFallback(
        selectedModel,
        async (modelName) => {
          const chat = ai.chats.create({
            model: modelName,
            history: historyTurns,
            config: {
              systemInstruction,
            },
          });
          return chat.sendMessage({ message: latestUserMessage });
        },
      );

      res.json({
        reply: response.text ?? 'Sin respuesta del modelo.',
        model: usedModel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado en el chat.';
      console.error('[Gemini Chat Error]', message);
      res.status(502).json({
        error: `No se pudo generar respuesta en el chat: ${message}`,
      });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] IdeaSense AI & Cybersecurity corriendo en http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal]', err);
  process.exit(1);
});
