import { useRef, useState } from 'react';
import { AlertCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { parseApiJsonResponse } from '../lib/apiUtils';
import type {
  ChatMessage,
  ChatRoleId,
  FreeGeminiModel,
  KnnPrediction,
  SecurityAlert,
  TelemetryPacket,
} from '../lib/types';

interface GeminiChatViewProps {
  latestPacket: TelemetryPacket;
  prediction: KnnPrediction | null;
  alerts: SecurityAlert[];
}

const ROLE_OPTIONS: Array<{ id: ChatRoleId; label: string; description: string }> = [
  {
    id: 'soc_analyst',
    label: 'Analista SOC IoT',
    description: 'Evalúa vectores MITRE ATT&CK / OWASP IoT y anomalías físicas en sensores.',
  },
  {
    id: 'iot_architect',
    label: 'Ingeniero CircuitPython',
    description: 'Asiste con reglas de detección en ESP32, BLE NUS y clasificadores Edge AI.',
  },
  {
    id: 'workshop_mentor',
    label: 'Mentor Día AI & Cyber',
    description: 'Explica conceptos de seguridad física e IA de forma didáctica para el taller.',
  },
];

const MODEL_OPTIONS: Array<{ id: FreeGeminiModel; label: string; note: string }> = [
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite (Gratuito · Rápido)',
    note: 'Baja latencia y alta disponibilidad para respuestas rápidas en taller.',
  },
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Gratuito)',
    note: 'Con respaldo automático a Flash Lite ante saturación.',
  },
];

export function GeminiChatView({
  latestPacket,
  prediction,
  alerts,
}: GeminiChatViewProps) {
  const [roleId, setRoleId] = useState<ChatRoleId>('soc_analyst');
  const [model, setModel] = useState<FreeGeminiModel>('gemini-3.1-flash-lite');
  const [includeTelemetry, setIncludeTelemetry] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      model: 'gemini-3.1-flash-lite',
      ts: Date.now(),
      text: 'Hola. Soy tu asistente gratuito de IA y Ciberseguridad para la plataforma IdeaSense Explorer. Puedes preguntarme sobre las alertas físicas detectadas, cómo endurecer el firmware CircuitPython o cómo explicar este ataque en el Día de AI & Cybersecurity.',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (customText?: string) => {
    const content = (customText ?? input).trim();
    if (!content || sending) return;

    setErrorMsg(null);
    setLastFailedPrompt(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
      ts: Date.now(),
    };
    const nextThread = [...messages, userMsg];
    const apiMessages = nextThread
      .filter((m) => !m.id.startsWith('welcome-') && !m.id.startsWith('reset-'))
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages(nextThread);
    if (!customText) setInput('');
    setSending(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          roleId,
          telemetryContext: includeTelemetry
            ? {
                latestPacket,
                knnPrediction: prediction,
                recentAlerts: alerts.slice(0, 5),
              }
            : undefined,
        }),
      });
      const parsed = await parseApiJsonResponse<{
        reply?: string;
        model?: FreeGeminiModel;
        error?: string;
      }>(resp, 'No se pudo obtener respuesta del chat.');
      if (!parsed.ok || !parsed.data?.reply) {
        setMessages(messages);
        if (!customText) setInput(content);
        setLastFailedPrompt(content);
        setErrorMsg(parsed.error || 'No se pudo obtener respuesta del chat.');
      } else {
        const replyText = parsed.data.reply;
        const replyModel = parsed.data.model;
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: replyText,
            model: replyModel,
            ts: Date.now(),
          },
        ]);
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch (err) {
      setMessages(messages);
      if (!customText) setInput(content);
      setLastFailedPrompt(content);
      setErrorMsg(err instanceof Error ? err.message : 'Error de red al consultar el chat.');
    } finally {
      setSending(false);
    }
  };

  const activeRole = ROLE_OPTIONS.find((r) => r.id === roleId)!;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left Configuration Panel */}
      <aside className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Configuración del Chatbot (Nivel Gratuito)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Chat multi-turno con memoria de conversación, roles de ciberseguridad y modelos gratuitos de Gemini.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Rol del sistema (System Instruction)
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value as ChatRoleId)}
                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {activeRole.description}
              </span>
            </label>

            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Modelo Gemini (Sin costo)
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as FreeGeminiModel)}
                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeTelemetry}
                onChange={(e) => setIncludeTelemetry(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Incluir telemetría y alertas SOC actuales en cada turno
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Consultas rápidas de demostración
          </h3>
          <div className="mt-3 space-y-2">
            {[
              'Analiza las alertas actuales e indica el vector físico más probable.',
              '¿Cómo detecto un canal encubierto óptico en el LTR-303 usando CircuitPython?',
              'Explícale a estudiantes de primer ingreso qué mide el Z-score en el k-NN.',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                disabled={sending}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      </aside>

      {/* Right Scrollable Multi-Turn Conversation */}
      <section className="flex h-[620px] flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Hilo de Conversación SOC · {activeRole.label}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {messages.length} mensajes en sesión · Modelo activo: <span className="font-mono">{model}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  id: `reset-${Date.now()}`,
                  role: 'model',
                  model,
                  ts: Date.now(),
                  text: 'Conversación reiniciada. ¿Qué incidente físico o consulta de ciberseguridad deseas revisar?',
                },
              ])
            }
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Limpiar historial
          </button>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto p-5"
          aria-live="polite"
          data-testid="gemini-chat-thread"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                {msg.role === 'user' ? 'Tú' : `${activeRole.label} · ${msg.model ?? model}`}
                {' · '}
                <span className="font-mono tabular-nums">
                  {new Date(msg.ts).toLocaleTimeString('es-CR', { hour12: false })}
                </span>
              </div>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={threadEndRef} />
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mx-5 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
            {lastFailedPrompt && (
              <button
                type="button"
                onClick={() => sendMessage(lastFailedPrompt)}
                disabled={sending}
                className="shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 border-t border-slate-200 p-4 dark:border-slate-800"
        >
          <label htmlFor="chat-message-input" className="sr-only">
            Escribe tu mensaje para el asistente SOC
          </label>
          <input
            id="chat-message-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre mitigaciones, vectores IoT o código CircuitPython..."
            disabled={sending}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </section>
    </div>
  );
}
