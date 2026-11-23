import { useEffect, useRef, useState } from 'react';
import { KeyRound, Play, RotateCcw } from 'lucide-react';
import type { TelemetryPacket } from '../lib/types';

interface MfaBruteDefenseGameProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

const LOCK_ICON = [
  0, 1, 1, 1, 0,
  0, 1, 0, 1, 0,
  1, 1, 1, 1, 1,
  1, 1, 0, 1, 1,
  1, 1, 1, 1, 1,
];

export function MfaBruteDefenseGame({ latestPacket, onSyncMatrix }: MfaBruteDefenseGameProps) {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeNode, setActiveNode] = useState<0 | 1 | 2>(0); // 0=A, 1=B, 2=AB

  const prevBaRef = useRef(0);
  const prevBbRef = useRef(0);

  const rotateKeyOnNode = (nodeIdx: 0 | 1 | 2) => {
    if (!running) return;
    if (nodeIdx === activeNode) {
      setScore((s) => s + 20 + streak * 2);
      setStreak((st) => st + 1);
      setActiveNode(Math.floor(Math.random() * 3) as 0 | 1 | 2);
    } else {
      setScore((s) => Math.max(0, s - 10));
      setStreak(0);
    }
  };

  const rotateRef = useRef(rotateKeyOnNode);
  rotateRef.current = rotateKeyOnNode;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === '1') rotateRef.current(0);
      else if (e.key === '2') rotateRef.current(1);
      else if (e.key === '3') rotateRef.current(2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running]);

  // IdeaBoard physical buttons A, B, or A+B
  useEffect(() => {
    if (!running) return;
    const aPressed = latestPacket.ba === 1 && prevBaRef.current === 0;
    const bPressed = latestPacket.bb === 1 && prevBbRef.current === 0;
    if (latestPacket.ba === 1 && latestPacket.bb === 1 && (aPressed || bPressed)) {
      rotateRef.current(2);
    } else if (aPressed) {
      rotateRef.current(0);
    } else if (bPressed) {
      rotateRef.current(1);
    }
    prevBaRef.current = latestPacket.ba;
    prevBbRef.current = latestPacket.bb;
  }, [latestPacket.ba, latestPacket.bb, running]);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setActiveNode(Math.floor(Math.random() * 3) as 0 | 1 | 2);
    setRunning(true);
    onSyncMatrix(LOCK_ICON);
  };

  const nodes: Array<{ idx: 0 | 1 | 2; title: string; inputHint: string }> = [
    { idx: 0, title: 'Nodo 1 · Gateway BLE', inputHint: 'Tecla 1 / Botón A' },
    { idx: 1, title: 'Nodo 2 · Vault I2C', inputHint: 'Tecla 2 / Botón B/C' },
    { idx: 2, title: 'Nodo 3 · Root Token', inputHint: 'Tecla 3 / Botón A+B' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Defensa MFA Anti-Fuerza Bruta
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rota la llave criptográfica en el nodo bajo ataque antes de que expire el temporizador de 30 s.
            </p>
          </div>
          <button
            type="button"
            onClick={startGame}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
          >
            {running ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
            {running ? 'Reiniciar (30 s)' : 'Iniciar Defensa MFA'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {nodes.map((n) => {
            const underAttack = running && activeNode === n.idx;
            return (
              <button
                key={n.idx}
                type="button"
                disabled={!running}
                onClick={() => rotateKeyOnNode(n.idx)}
                className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                  underAttack
                    ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/50'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <KeyRound
                    className={`h-5 w-5 ${
                      underAttack
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-xs font-semibold ${
                      underAttack
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {underAttack ? 'Ataque activo' : 'Asegurado'}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    {n.title}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {n.inputHint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Estado de Sesión MFA
          </h3>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Tiempo restante</span>
              <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {timeLeft}s
              </span>
            </div>
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Puntaje</span>
              <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {score}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500 dark:text-slate-400">Racha sin fallos</span>
              <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {streak}x
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
