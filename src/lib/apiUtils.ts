export interface ParsedApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const STATIC_HOST_MESSAGE =
  'Esta función de Gemini requiere el servidor Node.js con GEMINI_API_KEY. En alojamiento estático (como GitHub Pages), el Monitor SOC, Bluetooth BLE, Gemelo 3D, Laboratorio IA (k-NN) y los Juegos CyberLab siguen funcionando al 100% en tu navegador.';

export async function parseApiJsonResponse<T extends { error?: string }>(
  resp: Pick<Response, 'ok' | 'status' | 'text'>,
  fallbackError: string,
): Promise<ParsedApiResponse<T>> {
  const raw = (await resp.text()).trim();

  if (!raw) {
    if (resp.status === 404 || resp.status === 405) {
      return { ok: false, error: STATIC_HOST_MESSAGE };
    }
    return { ok: false, error: fallbackError };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    if (!resp.ok) {
      return { ok: false, error: parsed.error || fallbackError };
    }
    return { ok: true, data: parsed };
  } catch {
    if (resp.status === 404 || resp.status === 405 || raw.startsWith('<')) {
      return { ok: false, error: STATIC_HOST_MESSAGE };
    }
    return { ok: false, error: fallbackError };
  }
}
