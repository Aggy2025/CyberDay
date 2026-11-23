import { useEffect, useRef, useState } from 'react';
import { Eye, Play, RotateCcw } from 'lucide-react';
import type { TelemetryPacket } from '../lib/types';

interface OpticalDecoderGameProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

interface OpticalPulse {
  id: number;
  x: number; // moves from 580 -> 40
  speed: number;
  bit: '1' | '0' | 'NOISE';
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
  const [useOpticalSensor, setUseOpticalSensor] = useState(false);

  const pulsesRef = useRef<OpticalPulse[]>([]);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const bufferRef = useRef('');
  const targetPatternRef = useRef('101');
  const lastTriggerRef = useRef(0);
  const prevBtnARef = useRef(0);
  const prevLightHighRef = useRef(false);

  const captureSignal = () => {
    if (!running) return;
    const now = performance.now();
    if (now - lastTriggerRef.current < 160) return;
    lastTriggerRef.current = now;

    // Target capture zone is x in [65, 135]
    const hitIdx = pulsesRef.current.findIndex((p) => p.x >= 62 && p.x <= 138);
    if (hitIdx === -1) {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      return;
    }

    const hit = pulsesRef.current[hitIdx];
    pulsesRef.current.splice(hitIdx, 1);

    if (hit.bit === 'NOISE') {
      scoreRef.current = Math.max(0, scoreRef.current - 15);
      bufferRef.current = '';
      setScore(scoreRef.current);
      setBufferBits('');
      return;
    }

    const nextBuf = bufferRef.current + hit.bit;
    if (targetPatternRef.current.startsWith(nextBuf)) {
      bufferRef.current = nextBuf;
      setBufferBits(nextBuf);
      scoreRef.current += 15;
      setScore(scoreRef.current);

      if (nextBuf === targetPatternRef.current) {
        const token = TARGET_TOKENS[Math.floor(Math.random() * TARGET_TOKENS.length)];
        setDecodedTokens((prev) => [token, ...prev].slice(0, 6));
        scoreRef.current += 30;
        setScore(scoreRef.current);
        bufferRef.current = '';
        setBufferBits('');
        const patterns = ['101', '110', '011', '1001'];
        const nextPat = patterns[Math.floor(Math.random() * patterns.length)];
        targetPatternRef.current = nextPat;
        setCurrentPattern(nextPat);
      }
    } else {
      bufferRef.current = '';
      setBufferBits('');
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setScore(scoreRef.current);
    }
  };

  const captureRef = useRef(captureSignal);
  captureRef.current = captureSignal;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && running) {
        e.preventDefault();
        captureRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running]);

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

  const startGame = () => {
    pulsesRef.current = [];
    scoreRef.current = 0;
    bufferRef.current = '';
    targetPatternRef.current = '101';
    setScore(0);
    setDecodedTokens([]);
    setBufferBits('');
    setCurrentPattern('101');
    setRunning(true);
    onSyncMatrix(OPTICAL_ICON);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    let spawnAcc = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = canvas.width;
      const h = canvas.height;

      if (running) {
        spawnAcc += dt;
        if (spawnAcc >= 0.72) {
          spawnAcc = 0;
          const r = Math.random();
          const neededBit = targetPatternRef.current[bufferRef.current.length] ?? '1';
          const bit: OpticalPulse['bit'] =
            r < 0.22 ? 'NOISE' : r < 0.65 ? (neededBit as '0' | '1') : neededBit === '1' ? '0' : '1';
          pulsesRef.current.push({
            id: nextIdRef.current++,
            x: w - 20,
            speed: 175 + Math.min(130, scoreRef.current * 0.4),
            bit,
          });
        }

        pulsesRef.current = pulsesRef.current
          .map((p) => ({ ...p, x: p.x - p.speed * dt }))
          .filter((p) => p.x > -30);
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Optical fiber channel track
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, h / 2 - 26, w, 52);

      // Photodiode LTR-303 Capture Zone
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.fillRect(66, h / 2 - 44, 68, 88);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(66, h / 2 - 44, 68, 88);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LTR-303', 100, h / 2 - 54);

      for (const p of pulsesRef.current) {
        ctx.fillStyle =
          p.bit === 'NOISE' ? '#ef4444' : p.bit === '1' ? '#38bdf8' : '#10b981';
        ctx.beginPath();
        ctx.roundRect(p.x - 18, h / 2 - 18, 36, 36, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.bit === 'NOISE' ? '!' : p.bit, p.x, h / 2);
      }

      if (!running) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Decodificador de Canal Óptico (LTR-303)', w / 2, h / 2 - 12);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 12px "DM Sans", sans-serif';
        ctx.fillText(
          'Captura los bits correctos al pasar por el fotodiodo LTR-303 evitando ruido rojo (!)',
          w / 2,
          h / 2 + 14,
        );
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Decodificador de Canal Encubierto Óptico
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Captura los pulsos binarios cuando crucen el área ámbar usando Botón A, barra espaciadora o luz real sobre LTR-303.
            </p>
          </div>
          <button
            type="button"
            onClick={startGame}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap sm:self-auto"
          >
            {running ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
            {running ? 'Reiniciar' : 'Iniciar Decodificador'}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <canvas
            ref={canvasRef}
            width={640}
            height={280}
            data-testid="optical-decoder-canvas"
            className="block w-full bg-slate-900"
          />
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
            Trama Objetivo
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
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Puntaje</span>
              <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {score}
              </span>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Tokens interceptados</div>
              <div className="mt-1.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {decodedTokens.length > 0 ? decodedTokens.join(' · ') : 'Ninguno aún'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
