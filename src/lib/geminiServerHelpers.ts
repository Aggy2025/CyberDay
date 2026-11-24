export interface RawChatTurn {
  role: string;
  text: string;
}

export interface GeminiHistoryTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Normalizes multi-turn chat history for Gemini `ai.chats.create({ history })`:
 * - Strips empty turns
 * - Ensures history starts with a 'user' turn (never a synthetic 'model' greeting)
 * - Merges/skips consecutive same-role turns so user/model alternate strictly
 */
export function buildGeminiChatTurns(rawMessages: RawChatTurn[]): {
  history: GeminiHistoryTurn[];
  latestUserMessage: string;
} {
  const cleaned: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const m of rawMessages) {
    const text = String(m?.text ?? '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = m.role === 'model' ? 'model' : 'user';

    if (cleaned.length === 0 && role === 'model') {
      continue;
    }

    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === role) {
      prev.text = `${prev.text}\n${text}`;
    } else {
      cleaned.push({ role, text });
    }
  }

  if (cleaned.length === 0) {
    return { history: [], latestUserMessage: '' };
  }

  // Ensure the final turn we send via sendMessage() is a user message
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].role !== 'user') {
    cleaned.pop();
  }

  if (cleaned.length === 0) {
    return { history: [], latestUserMessage: '' };
  }

  const latestUserMessage = cleaned[cleaned.length - 1].text;
  const history = cleaned.slice(0, -1).map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));

  return { history, latestUserMessage };
}

export function formatGeminiErrorResponse(err: unknown): {
  httpStatus: number;
  message: string;
} {
  const rawStatus =
    (err as { status?: number; code?: number } | null)?.status ??
    (err as { code?: number } | null)?.code;
  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (
    rawStatus === 503 ||
    /503|UNAVAILABLE|high demand|overloaded|TIMEOUT/i.test(msg)
  ) {
    return {
      httpStatus: 503,
      message:
        'Los modelos gratuitos de Gemini (Flash Lite y 4 Hydrogen) están experimentando saturación temporal en los servidores de Google (HTTP 503). Intenta nuevamente en unos segundos.',
    };
  }

  if (rawStatus === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return {
      httpStatus: 429,
      message:
        'Se alcanzó temporalmente el límite de solicitudes gratuitas de Gemini (HTTP 429). Espera unos segundos antes de volver a consultar.',
    };
  }

  if (
    rawStatus === 403 ||
    rawStatus === 400 ||
    /API_KEY_INVALID|PERMISSION_DENIED|API key/i.test(msg)
  ) {
    return {
      httpStatus: 403,
      message:
        'La clave GEMINI_API_KEY configurada en Settings > Secrets no tiene permisos válidos o es incorrecta.',
    };
  }

  return {
    httpStatus: 502,
    message:
      'No se pudo completar la consulta con Gemini en este momento. Intenta nuevamente en unos segundos.',
  };
}
