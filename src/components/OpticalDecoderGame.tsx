import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Eye, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  computeSignalQualityPct,
  OPTICAL_TOKEN_LESSONS,
} from '../lib/cyberGamesEducation';
import { playBlockSfx, playErrorSfx, playSuccessSfx } from '../lib/gameAudio';
import type { TelemetryPacket } from '../lib/types';

interface OpticalDecoderGameProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

interface OpticalPulse {
  id: number;
  x: number;
  speed: number;
  bit: '1' | '0' | 'NOISE';
}

interface OpticalSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const TARGET_TOKENS = ['TLS', 'AES', 'KEY', 'SSH', 'OTP'];

const OPTICAL_ICON = [
  0, 0, 1, 0, 0,
  0, 1, 1, 1, 0,
  1, 1, 0, 1, 1,
  0, 1, 1, 1, 0,
  0, 0, 1, 0, 0,
];

export function OpticalDecoderGame({ latestPacket, onSyncMatrix }: OpticalDecoderGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [decodedTokens, setDecodedTokens] = useState<string[]>([]);
  const [currentPattern, setCurrentPattern] = useState('101');
  const [bufferBits, setBufferBits] = useState('');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [useOpticalSensor, setUseOpticalSensor] = useState(false);
  const [muted, setMuted] = useState(false);
  const [eventLesson, setEventLesson] = useState<string>(
    'Modulación OOK: un LED encendido representa "1" y apagado o atenuado representa "0".',
  );

  const pulsesRef = useRef<OpticalPulse[]>([]);
  const sparksRef = useRef<OpticalSpark[]>([]);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const bufferRef = useRef('');
  const targetPatternRef = useRef('101');
  const lastTriggerRef = useRef(0);
  const prevBtnARef = useRef(0);
  const prevLightHighRef = useRef(false);
  const captureFlashRef = useRef(0);
  const mutedRef = useRef(muted);
  const lightLevelRef = useRef(latestPacket.l);

  mutedRef.current = muted;
  lightLevelRef.current = latestPacket.l;

  const spawnSparks = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const spd = 45 + Math.random() * 90;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.38,
        color,
      });
    }
  };

  const captureSignal = useCallback(() => {
    if (!running) return;
    const now = performance.now();
    if (now - lastTriggerRef.current < 150) return;
    lastTriggerRef.current = now;
    captureFlashRef.current = 1;

    const hitIdx = pulsesRef.current.findIndex((p) => p.x >= 72 && p.x <= 148);
    if (hitIdx === -1) {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      setMisses((m) => m + 1);
      setEventLesson('Muestreo fuera de ventana: sincroniza la captura cuando el pulso entre al fotodiodo LTR-303.');
      playErrorSfx(mutedRef.current);
      return;
    }

    const hit = pulsesRef.current[hitIdx];
    pulsesRef.current.splice(hitIdx, 1);

    if (hit.bit === 'NOISE') {
      scoreRef.current = Math.max(0, scoreRef.current - 15);
      bufferRef.current = '';
      setScore(scoreRef.current);
      setBufferBits('');
      setMisses((m) => m + 1);
      spawnSparks(110, 150, '#ef4444');
      setEventLesson('Interferencia óptica (!): una fuente externa corrompió el bit y reinició la trama.');
      playErrorSfx(mutedRef.current);
      return;
    }

    const nextBuf = bufferRef.current + hit.bit;
    if (targetPatternRef.current.startsWith(nextBuf)) {
      bufferRef.current = nextBuf;
      setBufferBits(nextBuf);
      scoreRef.current += 15;
      setScore(scoreRef.current);
      setHits((h) => h + 1);
      spawnSparks(110, 150, hit.bit === '1' ? '#38bdf8' : '#10b981');

      if (nextBuf === targetPatternRef.current) {
        const token = TARGET_TOKENS[Math.floor(Math.random() * TARGET_TOKENS.length)];
        setDecodedTokens((prev) => [token, ...prev].slice(0, 6));
        scoreRef.current += 35;
        setScore(scoreRef.current);
        bufferRef.current = '';
        setBufferBits('');
        const patterns = ['101', '110', '011', '1001', '1010'];
        const nextPat = patterns[Math.floor(Math.random() * patterns.length)];
        targetPatternRef.current = nextPat;
        setCurrentPattern(nextPat);
        const lesson = OPTICAL_TOKEN_LESSONS[token];
        setEventLesson(`Trama completada → ${lesson.meaning}. ${lesson.riskNote}`);
        playSuccessSfx(mutedRef.current);
      } else {
        setEventLesson(`Bit "${hit.bit}" capturado correctamente (${nextBuf}/${targetPatternRef.current}).`);
        playBlockSfx(mutedRef.current);
      }
    } else {
      bufferRef.current = '';
      setBufferBits('');
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setScore(scoreRef.current);
      setMisses((m) => m + 1);
      spawnSparks(110, 150, '#f59e0b');
      setEventLesson(`Bit "${hit.bit}" no coincide con "${targetPatternRef.current}". Trama descartada por paridad.`);
      playErrorSfx(mutedRef.current);
    }
  }, [running]);

  const captureRef = useRef(captureSignal);
  captureRef.current = captureSignal;

  const startGame = useCallback(() => {
    pulsesRef.current = [];
    sparksRef.current = [];
    scoreRef.current = 0;
    bufferRef.current = '';
    targetPatternRef.current = '101';
    setScore(0);
    setHits(0);
    setMisses(0);
    setDecodedTokens([]);
    setBufferBits('');
    setCurrentPattern('101');
    setEventLesson('Canal óptico activo: captura la secuencia binaria al cruzar el sensor LTR-303.');
    setRunning(true);
    onSyncMatrix(OPTICAL_ICON);
  }, [onSyncMatrix]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (running) captureRef.current();
        else startGame();
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, startGame]);

  useEffect(() => {
    if (!running) return;
    if (latestPacket.ba === 1 && prevBtnARef.current === 0) {
      captureRef.current();
    }
    prevBtnARef.current = latestPacket.ba;

    if (useOpticalSensor) {
      const high = latestPacket.l > 450;
      if (high && !prevLightHighRef.current) {
        captureRef.current();
      }
      prevLightHighRef.current = high;
    }
  }, [latestPacket.ba, latestPacket.l, running, useOpticalSensor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    let spawnAcc = 0;
    let phaseT = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phaseT += dt;
      if (captureFlashRef.current > 0) captureFlashRef.current = Math.max(0, captureFlashRef.current - dt * 4);

      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2 + 12;

      if (running) {
        spawnAcc += dt;
        if (spawnAcc >= 0.72) {
          spawnAcc = 0;
          const r = Math.random();
          const neededBit = targetPatternRef.current[bufferRef.current.length] ?? '1';
          const bit: OpticalPulse['bit'] =
            r < 0.2 ? 'NOISE' : r < 0.68 ? (neededBit as '0' | '1') : neededBit === '1' ? '0' : '1';
          pulsesRef.current.push({
            id: nextIdRef.current++,
            x: w - 20,
            speed: 170 + Math.min(130, scoreRef.current * 0.35),
            bit,
          });
        }

        pulsesRef.current = pulsesRef.current
          .map((p) => ({ ...p, x: p.x - p.speed * dt }))
          .filter((p) => p.x > -30);
      }

      sparksRef.current = sparksRef.current
        .map((s) => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, life: s.life - dt }))
        .filter((s) => s.life > 0);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#091122');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Sequence target slots at top
      const pattern = targetPatternRef.current;
      const buf = bufferRef.current;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('SECUENCIA BINARIA OBJETIVO', w / 2, 22);

      const slotW = 34;
      const startX = w / 2 - (pattern.length * (slotW + 8) - 8) / 2;
      for (let i = 0; i < pattern.length; i++) {
        const sx = startX + i * (slotW + 8);
        const captured = i < buf.length;
        ctx.fillStyle = captured ? '#059669' : '#1e293b';
        ctx.beginPath();
        ctx.roundRect(sx, 34, slotW, 30, 6);
        ctx.fill();
        ctx.strokeStyle = captured ? '#6ee7b7' : i === buf.length ? '#f59e0b' : '#334155';
        ctx.lineWidth = i === buf.length ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillText(pattern[i], sx + slotW / 2, 49);
      }

      // Optical waveguide track
      ctx.fillStyle = '#131f38';
      ctx.fillRect(0, midY - 30, w, 60);

      // Animated carrier wave
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 6) {
        const y = midY + Math.sin(x * 0.045 - phaseT * 6) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Photodiode LTR-303 capture reticle
      ctx.fillStyle =
        captureFlashRef.current > 0 ? 'rgba(245, 158, 11, 0.34)' : 'rgba(245, 158, 11, 0.14)';
      ctx.beginPath();
      ctx.roundRect(74, midY - 48, 72, 96, 8);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText('LTR-303', 110, midY - 58);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${lightLevelRef.current} cts`, 110, midY + 58);

      // Pulses
      for (const p of pulsesRef.current) {
        const fill = p.bit === 'NOISE' ? '#dc2626' : p.bit === '1' ? '#0284c7' : '#059669';
        const stroke = p.bit === 'NOISE' ? '#fca5a5' : p.bit === '1' ? '#7dd3fc' : '#6ee7b7';
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(p.x - 20, midY - 20, 40, 40, 9);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.fillText(p.bit === 'NOISE' ? '!' : p.bit, p.x, midY);
      }

      // Sparks
      for (const sp of sparksRef.current) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.38);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  const signalQuality = computeSignalQualityPct(hits, misses);
  const latestTokenLesson =
    decodedTokens.length > 0 ? OPTICAL_TOKEN_LESSONS[decodedTokens[0]] : OPTICAL_TOKEN_LESSONS.TLS;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Decodificador Óptico · Canales Encubiertos (OOK)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Observa cómo pulsos de luz transportan bits secretos y cómo el ruido óptico corrompe la señal.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              {running ? (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {running ? 'Reiniciar' : 'Iniciar Decodificador'}
            </button>
          </div>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <canvas
            ref={canvasRef}
            width={640}
            height={300}
            data-testid="optical-decoder-canvas"
            className="block w-full bg-slate-950"
          />

          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center text-white">
              <div className="font-display text-lg font-bold">
                Decodificador de Canal Encubierto Óptico
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
                Captura los bits correctos (<code className="font-mono">0</code> y <code className="font-mono">1</code>) cuando crucen el fotodiodo LTR-303 evitando pulsos rojos de interferencia (<code className="font-mono">!</code>).
              </p>
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Iniciar Decodificador
              </button>
              <div className="mt-3 font-mono text-[11px] text-slate-400">
                Espacio · Botón físico A · Haz de linterna sobre LTR-303
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Análisis óptico: </span>
          {eventLesson}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => captureRef.current()}
            disabled={!running}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Capturar Bit (Espacio / Btn A)
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={useOpticalSensor}
              onChange={(e) => setUseOpticalSensor(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Disparar con luz física LTR-303 (&gt;450)
          </label>
        </div>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Telemetría de Trama
          </h3>
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Secuencia buscada</span>
              <span className="font-mono text-xl font-bold tracking-widest text-blue-600 dark:text-blue-400">
                {currentPattern}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Bits capturados</span>
              <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                {bufferBits || '---'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Puntaje</div>
                <div className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {score}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Calidad señal</div>
                <div className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {signalQuality}%
                </div>
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Tokens interceptados</div>
              <div className="mt-1.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {decodedTokens.length > 0 ? decodedTokens.join(' · ') : 'Ninguno aún'}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              ¿Qué enseña este reto? · Token {latestTokenLesson.token}
            </h3>
          </div>
          <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
            {latestTokenLesson.riskNote}
          </p>
          <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
            En ciberseguridad física se monitorea el <span className="font-mono">LTR-303</span> para detectar tanto fugas ópticas como apertura no autorizada de chasis.
          </p>
        </section>
      </div>
    </div>
  );
}
