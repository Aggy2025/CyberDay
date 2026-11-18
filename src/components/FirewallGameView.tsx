import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import type { TelemetryPacket } from '../lib/types';

interface FirewallGameViewProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

interface PacketEntity {
  id: number;
  lane: number; // 0..4
  y: number;
  speed: number;
  isThreat: boolean;
  label: string;
}

const THREAT_LABELS = ['DDoS', 'Phish', 'Malware', 'Brute', 'Scan'];
const SAFE_LABELS = ['TLS', 'SSH', 'HTTPS'];

const SHIELD_ICON = [
  1, 1, 1, 1, 1,
  1, 0, 1, 0, 1,
  1, 1, 1, 1, 1,
  0, 1, 1, 1, 0,
  0, 0, 1, 0, 0,
];

const HIT_ICON = [
  1, 0, 0, 0, 1,
  0, 1, 0, 1, 0,
  0, 0, 1, 0, 0,
  0, 1, 0, 1, 0,
  1, 0, 0, 0, 1,
];

export function FirewallGameView({ latestPacket, onSyncMatrix }: FirewallGameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100);
  const [intercepted, setIntercepted] = useState(0);
  const [useTiltControl, setUseTiltControl] = useState(false);

  const playerLaneRef = useRef(2);
  const entitiesRef = useRef<PacketEntity[]>([]);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const integrityRef = useRef(100);
  const interceptedRef = useRef(0);
  const lastBtnARef = useRef(0);
  const lastBtnBRef = useRef(0);
  const packetRef = useRef(latestPacket);
  const tiltRef = useRef(useTiltControl);

  packetRef.current = latestPacket;
  tiltRef.current = useTiltControl;

  const moveLane = (delta: number) => {
    playerLaneRef.current = Math.max(0, Math.min(4, playerLaneRef.current + delta));
  };

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveLane(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Physical IdeaBoard button A / B edge detection
  useEffect(() => {
    if (!running) return;
    if (latestPacket.ba === 1 && lastBtnARef.current === 0) {
      moveLane(-1);
    }
    if (latestPacket.bb === 1 && lastBtnBRef.current === 0) {
      moveLane(1);
    }
    lastBtnARef.current = latestPacket.ba;
    lastBtnBRef.current = latestPacket.bb;
  }, [latestPacket.ba, latestPacket.bb, running]);

  const startGame = () => {
    entitiesRef.current = [];
    scoreRef.current = 0;
    integrityRef.current = 100;
    interceptedRef.current = 0;
    playerLaneRef.current = 2;
    setScore(0);
    setIntegrity(100);
    setIntercepted(0);
    setRunning(true);
    onSyncMatrix(SHIELD_ICON);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let spawnAcc = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;
      const laneW = w / 5;

      if (running) {
        if (tiltRef.current) {
          const ax = packetRef.current.ax;
          if (ax < -0.3) playerLaneRef.current = 0;
          else if (ax < -0.12) playerLaneRef.current = 1;
          else if (ax > 0.3) playerLaneRef.current = 4;
          else if (ax > 0.12) playerLaneRef.current = 3;
          else playerLaneRef.current = 2;
        }

        spawnAcc += dt;
        const spawnEvery = Math.max(0.45, 0.95 - scoreRef.current * 0.002);
        if (spawnAcc >= spawnEvery) {
          spawnAcc = 0;
          const isThreat = Math.random() < 0.68;
          const lane = Math.floor(Math.random() * 5);
          entitiesRef.current.push({
            id: nextIdRef.current++,
            lane,
            y: -28,
            speed: 135 + Math.min(180, scoreRef.current * 0.8),
            isThreat,
            label: isThreat
              ? THREAT_LABELS[Math.floor(Math.random() * THREAT_LABELS.length)]
              : SAFE_LABELS[Math.floor(Math.random() * SAFE_LABELS.length)],
          });
        }

        const nextEntities: PacketEntity[] = [];
        const shieldY = h - 58;

        for (const ent of entitiesRef.current) {
          ent.y += ent.speed * dt;
          const hitShield =
            ent.lane === playerLaneRef.current && ent.y >= shieldY - 14 && ent.y <= shieldY + 20;

          if (hitShield) {
            if (ent.isThreat) {
              scoreRef.current += 10;
              interceptedRef.current += 1;
              setScore(scoreRef.current);
              setIntercepted(interceptedRef.current);
            } else {
              // Blocked safe TLS traffic by mistake
              integrityRef.current = Math.max(0, integrityRef.current - 5);
              setIntegrity(integrityRef.current);
            }
            continue;
          }

          if (ent.y > h) {
            if (ent.isThreat) {
              integrityRef.current = Math.max(0, integrityRef.current - 15);
              setIntegrity(integrityRef.current);
              if (integrityRef.current <= 0) {
                setRunning(false);
                onSyncMatrix(HIT_ICON);
              }
            } else {
              scoreRef.current += 5;
              setScore(scoreRef.current);
            }
            continue;
          }

          nextEntities.push(ent);
        }
        entitiesRef.current = nextEntities;
      }

      // Draw background & lanes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, h);
        ctx.stroke();
      }

      // Draw packets
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 11px "JetBrains Mono", monospace';

      for (const ent of entitiesRef.current) {
        const cx = ent.lane * laneW + laneW / 2;
        ctx.fillStyle = ent.isThreat ? '#dc2626' : '#059669';
        ctx.beginPath();
        ctx.roundRect(cx - 30, ent.y - 14, 60, 28, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(ent.label, cx, ent.y);
      }

      // Draw Firewall Shield (Player)
      const px = playerLaneRef.current * laneW + laneW / 2;
      const py = h - 46;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(px - 36, py - 12, 72, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ESCUDO', px, py);

      if (!running) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          integrityRef.current <= 0 ? 'Brecha en el Firewall' : 'Firewall Interceptor 2D',
          w / 2,
          h / 2 - 14,
        );
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 13px "DM Sans", sans-serif';
        ctx.fillText(
          'Intercepta paquetes rojos (ataques) y deja pasar tráfico verde (TLS)',
          w / 2,
          h / 2 + 14,
        );
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [running, onSyncMatrix]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Reto Interactivo: Firewall Interceptor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usa los botones físicos A / B de la IdeaBoard, inclinación del acelerómetro o flechas del teclado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              {running ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reiniciar
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Iniciar Partida
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            data-testid="firewall-canvas"
            className="block w-full bg-slate-900"
          />
        </div>

        {/* Touch / Projector Backup Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveLane(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Izquierda (Btn A)
            </button>
            <button
              type="button"
              onClick={() => moveLane(1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Derecha (Btn B)
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={useTiltControl}
              onChange={(e) => setUseTiltControl(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Controlar con inclinación IMU (Ax)
          </label>
        </div>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Métricas de Defensa
            </h3>
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Puntaje acumulado</span>
              <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {score}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Amenazas bloqueadas</span>
              <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {intercepted}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Integridad del sistema</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {integrity}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    integrity > 50 ? 'bg-emerald-600' : integrity > 25 ? 'bg-amber-500' : 'bg-red-600'
                  }`}
                  style={{ width: `${integrity}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Conexión con Ciberseguridad
          </h3>
          <p className="mt-2 leading-relaxed">
            Al igual que un Firewall o sistema IDS/IPS, el jugador debe distinguir tráfico malicioso (DDoS, Phishing, Malware) de sesiones legítimas (TLS, HTTPS). Bloquear tráfico válido penaliza disponibilidad (-5% integridad); dejar pasar amenazas compromete confidencialidad e integridad (-15%).
          </p>
        </section>
      </div>
    </div>
  );
}
