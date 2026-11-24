import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiChatTurns,
  formatGeminiErrorResponse,
} from './geminiServerHelpers';

test('buildGeminiChatTurns strips leading model welcome message and keeps alternating turns', () => {
  const result = buildGeminiChatTurns([
    { role: 'model', text: 'Hola, soy tu asistente.' },
    { role: 'user', text: '¿Qué es el LTR-303?' },
    { role: 'model', text: 'Es un sensor de luz digital I2C.' },
    { role: 'user', text: '¿Qué dirección usa?' },
  ]);

  assert.equal(result.latestUserMessage, '¿Qué dirección usa?');
  assert.equal(result.history.length, 2);
  assert.equal(result.history[0].role, 'user');
  assert.equal(result.history[1].role, 'model');
});

test('buildGeminiChatTurns merges consecutive user turns from failed prior requests', () => {
  const result = buildGeminiChatTurns([
    { role: 'user', text: 'Primera pregunta fallida' },
    { role: 'user', text: 'Segunda pregunta' },
  ]);

  assert.equal(result.history.length, 0);
  assert.match(result.latestUserMessage, /Primera pregunta fallida/);
  assert.match(result.latestUserMessage, /Segunda pregunta/);
});

test('formatGeminiErrorResponse maps 503 high-demand and 429 quota errors cleanly', () => {
  const err503 = formatGeminiErrorResponse(
    new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'),
  );
  assert.equal(err503.httpStatus, 503);
  assert.match(err503.message, /saturación temporal/i);

  const err429 = formatGeminiErrorResponse({ status: 429, message: 'RESOURCE_EXHAUSTED' });
  assert.equal(err429.httpStatus, 429);
  assert.match(err429.message, /límite de solicitudes/i);
});
