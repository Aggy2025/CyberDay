import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApiJsonResponse } from './apiUtils';

test('parseApiJsonResponse returns parsed JSON on 200 OK', async () => {
  const result = await parseApiJsonResponse<{ reply: string; error?: string }>(
    {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ reply: 'Análisis listo' }),
    },
    'Error genérico',
  );
  assert.equal(result.ok, true);
  assert.equal(result.data?.reply, 'Análisis listo');
});

test('parseApiJsonResponse surfaces server JSON error on 503', async () => {
  const result = await parseApiJsonResponse<{ error?: string }>(
    {
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ error: 'Falta GEMINI_API_KEY' }),
    },
    'Error genérico',
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Falta GEMINI_API_KEY');
});

test('parseApiJsonResponse detects HTML 404/405 from static hosting like GitHub Pages', async () => {
  const result = await parseApiJsonResponse<{ error?: string }>(
    {
      ok: false,
      status: 405,
      text: async () => '<!DOCTYPE html><html><body>405 Not Allowed</body></html>',
    },
    'Error genérico',
  );
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /GitHub Pages/);
});
