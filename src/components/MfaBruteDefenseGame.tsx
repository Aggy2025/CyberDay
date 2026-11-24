import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  KeyRound,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  computeMfaDefenseScore,
  MFA_NODE_LESSONS,
} from '../lib/cyberGamesEducation';
import { playBlockSfx, playErrorSfx, playSuccessSfx } from '../lib/gameAudio';
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

const BREACH_ICON = [
  1, 0, 0, 0, 1,
  0, 1, 0, 1, 0,
  0, 0, 1, 0, 0,
  0, 1, 0, 1, 0,
  1, 0, 0, 0, 1,
];

const WAVE_WINDOW_MS = 3800;

export function MfaBruteDefenseGame({ latestPacket, onSyncMatrix }: MfaBruteDefenseGameProps) {
  const [phase, setPhase] = useState<'title' | 'playing' | 'gameover'>('title');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lives, setLives] = useState(3);
  const [activeNode, setActiveNode] = useState<0 | 1 | 2>(0);
  const [waveProgressPct, setWaveProgressPct] = useState(0);
  const [muted, setMuted] = useState(false);
  const [statusNote, setStatusNote] = useState(
    'Rota la llave del nodo atacado usando Teclas 1/2/3 o botones físicos A, B y A+B.',
  );

  const prevBaRef = useRef(0);
  const prevBbRef = useRef(0);
  const waveStartRef = useRef(Date.now());
  const streakRef = useRef(0);
  const timeLeftRef = useRef(30);
  const livesRef = useRef(3);
  const mutedRef = useRef(muted);
  const phaseRef = useRef(phase);

  streakRef.current = streak;
  mutedRef.current = muted;
  phaseRef.current = phase;

  const pickNextNode = (exclude?: 0 | 1 | 2): 0 | 1 | 2 => {
    const candidates = ([0, 1, 2] as const).filter((n) => n !== exclude);
    return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
  };

  const rotateKeyOnNode = useCallback(
    (nodeIdx: 0 | 1 | 2) => {
      if (phaseRef.current !== 'playing') return;
      const lesson = MFA_NODE_LESSONS[nodeIdx];

      if (nodeIdx === activeNode) {
        const pts = computeMfaDefenseScore(streakRef.current);
        const nextStreak = streakRef.current + 1;
        setScore((s) => s + pts);
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setActiveNode(pickNextNode(nodeIdx));
        waveStartRef.current = Date.now();
        setWaveProgressPct(0);
        setStatusNote(`Llave rotada en ${lesson.title} (+${pts} pts).`);
        playBlockSfx(mutedRef.current);
      } else {
        setScore((s) => Math.max(0, s - 10));
        setStreak(0);
        setStatusNote(`Nodo equivocado (${lesson.title}): el ataque sigue activo en otro nodo (-10 pts).`);
        playErrorSfx(mutedRef.current);
      }
    },
    [activeNode],
  );

  const rotateRef = useRef(rotateKeyOnNode);
  rotateRef.current = rotateKeyOnNode;

  const startGame = useCallback(() => {
    timeLeftRef.current = 30;
    livesRef.current = 3;
    streakRef.current = 0;
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(30);
    setLives(3);
    setWaveProgressPct(0);
    waveStartRef.current = Date.now();
    setActiveNode(Math.floor(Math.random() * 3) as 0 | 1 | 2);
    setStatusNote('Defensa MFA activa: responde con la credencial física correcta antes de que expire la barra.');
    setPhase('playing');
    onSyncMatrix(LOCK_ICON);
  }, [onSyncMatrix]);

  // 1s session countdown + 60ms brute-force wave crack progress bar
  useEffect(() => {
    if (phase !== 'playing') return;
    const secTimer = window.setInterval(() => {
      const nextTime = timeLeftRef.current - 1;
      timeLeftRef.current = Math.max(0, nextTime);
      setTimeLeft(timeLeftRef.current);
      if (nextTime <= 0) {
        setPhase('gameover');
        playSuccessSfx(mutedRef.current);
      }
    }, 1000);

    const waveTimer = window.setInterval(() => {
      const elapsed = Date.now() - waveStartRef.current;
      const pct = Math.min(100, Math.round((elapsed / WAVE_WINDOW_MS) * 100));
      setWaveProgressPct(pct);

      if (elapsed >= WAVE_WINDOW_MS) {
        waveStartRef.current = Date.now();
        setWaveProgressPct(0);
        setStreak(0);
        streakRef.current = 0;
        playErrorSfx(mutedRef.current);

        const nextLives = Math.max(0, livesRef.current - 1);
        livesRef.current = nextLives;
        setLives(nextLives);
        if (nextLives <= 0) {
          setPhase('gameover');
          onSyncMatrix(BREACH_ICON);
          setStatusNote('Credencial comprometida por fuerza bruta: se agotaron las vidas de defensa.');
        } else {
          setActiveNode((curr) => pickNextNode(curr));
          setStatusNote('El atacante agotó la ventana de tiempo y forzó una sesión (-1 vida).');
        }
      }
    }, 60);

    return () => {
      window.clearInterval(secTimer);
      window.clearInterval(waveTimer);
    };
  }, [phase, onSyncMatrix]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (e.key === '1') rotateRef.current(0);
      else if (e.key === '2') rotateRef.current(1);
      else if (e.key === '3') rotateRef.current(2);
      else if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame]);

  // IdeaBoard physical buttons A, B, or A+B
  useEffect(() => {
    if (phase !== 'playing') return;
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
  }, [latestPacket.ba, latestPacket.bb, phase]);

  const activeLesson = MFA_NODE_LESSONS[activeNode];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              3. Defensa MFA Anti-Fuerza Bruta · Presencia Física
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comprende por qué exigir confirmación física en hardware y rotar llaves frena ataques automatizados.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
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
              data-start="true"
              onClick={startGame}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              {phase === 'playing' ? (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {phase === 'playing' ? 'Reiniciar (30 s)' : 'Iniciar Defensa MFA'}
            </button>
          </div>
        </div>

        {/* Visual Topology & Attacker Progress Arena */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-red-400" aria-hidden="true" />
              <div>
                <div className="font-display text-sm font-semibold">
                  {phase === 'playing'
                    ? `Botnet atacando: ${activeLesson.title}`
                    : phase === 'gameover'
                      ? lives <= 0
                        ? 'Brecha por Fuerza Bruta'
                        : 'Turno Completado · Red Protegida'
                      : 'Topología de Autenticación Hardware'}
                </div>
                <div className="text-xs text-slate-400">
                  {phase === 'playing'
                    ? `Progreso del intento automático: ${waveProgressPct}%`
                    : 'Pulsa Iniciar Defensa MFA o Enter para comenzar.'}
                </div>
              </div>
            </div>

            <div className="font-mono text-xs text-slate-300 tabular-nums">
              Vidas: {lives}/3 · Tiempo: {timeLeft}s
            </div>
          </div>

          {/* Attack crack progress bar */}
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                waveProgressPct > 72
                  ? 'bg-red-500'
                  : waveProgressPct > 45
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
              }`}
              style={{ width: `${phase === 'playing' ? waveProgressPct : 0}%` }}
            />
          </div>

          {/* SVG Topology Lines connecting Attacker -> 3 Nodes */}
          <svg
            viewBox="0 0 600 58"
            className="mt-3 h-12 w-full"
            aria-hidden="true"
          >
            {[100, 300, 500].map((targetX, idx) => {
              const isTarget = phase === 'playing' && activeNode === idx;
              return (
                <g key={targetX}>
                  <path
                    d={`M 300 4 C 300 28, ${targetX} 26, ${targetX} 54`}
                    fill="none"
                    stroke={isTarget ? '#ef4444' : '#334155'}
                    strokeWidth={isTarget ? 2.5 : 1.5}
                    strokeDasharray={isTarget ? '6 4' : undefined}
                  />
                  <circle
                    cx={targetX}
                    cy={54}
                    r={4}
                    fill={isTarget ? '#ef4444' : '#475569'}
                  />
                </g>
              );
            })}
            <circle cx="300" cy="6" r="5" fill={phase === 'playing' ? '#ef4444' : '#64748b'} />
          </svg>

          {/* 3 Interactive Infrastructure Nodes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MFA_NODE_LESSONS.map((n) => {
              const underAttack = phase === 'playing' && activeNode === n.idx;
              return (
                <button
                  key={n.idx}
                  type="button"
                  disabled={phase !== 'playing'}
                  onClick={() => rotateKeyOnNode(n.idx)}
                  className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                    underAttack
                      ? 'border-red-500 bg-red-950/70 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <KeyRound
                      className={`h-5 w-5 ${underAttack ? 'text-red-400' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-xs font-semibold ${
                        underAttack ? 'text-red-300' : 'text-emerald-400'
                      }`}
                    >
                      {underAttack ? 'Bajo ataque' : 'Asegurado'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="font-display text-sm font-bold text-white">
                      {n.title}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">{n.protocol}</div>
                    <div className="mt-2 font-mono text-xs text-sky-300">
                      {n.inputHint}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Estado: </span>
          {statusNote}
        </div>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Estado de Sesión MFA
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400">Tiempo restante</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {timeLeft}s
              </div>
            </div>
            <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400">Puntaje</div>
              <div className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {score}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Racha actual</div>
              <div className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {streak}x
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Mejor racha</div>
              <div className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {bestStreak}x
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Lección · {activeLesson.title}
            </h3>
          </div>
          <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
            {activeLesson.concept}
          </p>
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Contramedida MFA: </span>
            <span className="text-slate-600 dark:text-slate-300">{activeLesson.mitigation}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
