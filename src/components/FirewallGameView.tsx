import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  computeFirewallAccuracy,
  computeSecurityGrade,
  FIREWALL_LESSONS,
  type FirewallPacketKind,
  type PacketCyberLesson,
} from '../lib/cyberGamesEducation';
import { playBlockSfx, playErrorSfx, playSuccessSfx } from '../lib/gameAudio';
import type { TelemetryPacket } from '../lib/types';

interface FirewallGameViewProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

interface PacketEntity {
  id: number;
  lane: number;
  y: number;
  speed: number;
  isThreat: boolean;
  kind: FirewallPacketKind;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const THREAT_KINDS: FirewallPacketKind[] = ['DDoS', 'Phish', 'Malware', 'Brute', 'Scan'];
const SAFE_KINDS: FirewallPacketKind[] = ['TLS', 'SSH', 'HTTPS'];

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
  const [phase, setPhase] = useState<'title' | 'playing' | 'gameover'>('title');
  const [score, setScore] = useState(0);
  const [integrity, setIntegrity] = useState(100);
  const [blockedThreats, setBlockedThreats] = useState(0);
  const [allowedSafe, setAllowedSafe] = useState(0);
  const [falsePositives, setFalsePositives] = useState(0);
  const [missedThreats, setMissedThreats] = useState(0);
  const [useTiltControl, setUseTiltControl] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeLesson, setActiveLesson] = useState<PacketCyberLesson>(FIREWALL_LESSONS.DDoS);
  const [lastEventNote, setLastEventNote] = useState<string>(
    'Intercepta paquetes rojos (amenazas) y deja pasar paquetes verdes cifrados.',
  );

  const playerLaneRef = useRef(2);
  const visualLaneXRef = useRef(2);
  const entitiesRef = useRef<PacketEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<FloatingPopup[]>([]);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const integrityRef = useRef(100);
  const statsRef = useRef({ blockedThreats: 0, allowedSafe: 0, falsePositives: 0, missedThreats: 0 });
  const shakeRef = useRef(0);
  const shieldFlashRef = useRef(0);
  const lastBtnARef = useRef(0);
  const lastBtnBRef = useRef(0);
  const packetRef = useRef(latestPacket);
  const tiltRef = useRef(useTiltControl);
  const mutedRef = useRef(muted);
  const phaseRef = useRef(phase);

  packetRef.current = latestPacket;
  tiltRef.current = useTiltControl;
  mutedRef.current = muted;
  phaseRef.current = phase;

  const moveLane = useCallback((delta: number) => {
    playerLaneRef.current = Math.max(0, Math.min(4, playerLaneRef.current + delta));
  }, []);

  const spawnBurst = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 55 + Math.random() * 115;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.42,
        maxLife: 0.42,
        color,
      });
    }
    if (particlesRef.current.length > 90) {
      particlesRef.current = particlesRef.current.slice(-90);
    }
  };

  const startGame = useCallback(() => {
    entitiesRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];
    scoreRef.current = 0;
    integrityRef.current = 100;
    statsRef.current = { blockedThreats: 0, allowedSafe: 0, falsePositives: 0, missedThreats: 0 };
    playerLaneRef.current = 2;
    visualLaneXRef.current = 2;
    shakeRef.current = 0;
    shieldFlashRef.current = 0;
    setScore(0);
    setIntegrity(100);
    setBlockedThreats(0);
    setAllowedSafe(0);
    setFalsePositives(0);
    setMissedThreats(0);
    setActiveLesson(FIREWALL_LESSONS.DDoS);
    setLastEventNote('Partida iniciada: clasifica cada paquete en tiempo real.');
    setPhase('playing');
    onSyncMatrix(SHIELD_ICON);
  }, [onSyncMatrix]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') {
        if ((e.key === 'Enter' || e.code === 'Space') && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveLane(1);
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveLane, startGame]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (latestPacket.ba === 1 && lastBtnARef.current === 0) moveLane(-1);
    if (latestPacket.bb === 1 && lastBtnBRef.current === 0) moveLane(1);
    lastBtnARef.current = latestPacket.ba;
    lastBtnBRef.current = latestPacket.bb;
  }, [latestPacket.ba, latestPacket.bb, phase, moveLane]);

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
      const shieldY = h - 52;

      visualLaneXRef.current += (playerLaneRef.current - visualLaneXRef.current) * Math.min(1, dt * 18);
      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt * 3.5);
      if (shieldFlashRef.current > 0) shieldFlashRef.current = Math.max(0, shieldFlashRef.current - dt * 4);

      if (phase === 'playing') {
        if (tiltRef.current) {
          const ax = packetRef.current.ax;
          if (ax < -0.3) playerLaneRef.current = 0;
          else if (ax < -0.12) playerLaneRef.current = 1;
          else if (ax > 0.3) playerLaneRef.current = 4;
          else if (ax > 0.12) playerLaneRef.current = 3;
          else playerLaneRef.current = 2;
        }

        spawnAcc += dt;
        const spawnEvery = Math.max(0.46, 0.92 - scoreRef.current * 0.0018);
        if (spawnAcc >= spawnEvery) {
          spawnAcc = 0;
          const isThreat = Math.random() < 0.64;
          const lane = Math.floor(Math.random() * 5);
          const kind = isThreat
            ? THREAT_KINDS[Math.floor(Math.random() * THREAT_KINDS.length)]
            : SAFE_KINDS[Math.floor(Math.random() * SAFE_KINDS.length)];
          entitiesRef.current.push({
            id: nextIdRef.current++,
            lane,
            y: -26,
            speed: 128 + Math.min(185, scoreRef.current * 0.72),
            isThreat,
            kind,
          });
        }

        const nextEntities: PacketEntity[] = [];
        for (const ent of entitiesRef.current) {
          ent.y += ent.speed * dt;
          const cx = ent.lane * laneW + laneW / 2;
          const hitShield =
            ent.lane === playerLaneRef.current && ent.y >= shieldY - 18 && ent.y <= shieldY + 18;

          if (hitShield) {
            setActiveLesson(FIREWALL_LESSONS[ent.kind]);
            if (ent.isThreat) {
              scoreRef.current += 15;
              statsRef.current.blockedThreats += 1;
              shieldFlashRef.current = 1;
              setScore(scoreRef.current);
              setBlockedThreats(statsRef.current.blockedThreats);
              setLastEventNote(`Bloqueaste ${ent.kind}: ataque neutralizado (+15 pts).`);
              spawnBurst(cx, shieldY, '#38bdf8', 14);
              popupsRef.current.push({
                x: cx,
                y: shieldY - 22,
                text: `+15 ${ent.kind}`,
                color: '#38bdf8',
                life: 0.75,
              });
              playBlockSfx(mutedRef.current);
            } else {
              integrityRef.current = Math.max(0, integrityRef.current - 5);
              statsRef.current.falsePositives += 1;
              shakeRef.current = 0.45;
              setIntegrity(integrityRef.current);
              setFalsePositives(statsRef.current.falsePositives);
              setLastEventNote(`Falso positivo: bloqueaste tráfico legítimo ${ent.kind} (-5% integridad).`);
              spawnBurst(cx, shieldY, '#f59e0b', 10);
              popupsRef.current.push({
                x: cx,
                y: shieldY - 22,
                text: 'Falso positivo -5%',
                color: '#fbbf24',
                life: 0.85,
              });
              playErrorSfx(mutedRef.current);
            }
            continue;
          }

          if (ent.y > h + 10) {
            setActiveLesson(FIREWALL_LESSONS[ent.kind]);
            if (ent.isThreat) {
              integrityRef.current = Math.max(0, integrityRef.current - 15);
              statsRef.current.missedThreats += 1;
              shakeRef.current = 0.9;
              setIntegrity(integrityRef.current);
              setMissedThreats(statsRef.current.missedThreats);
              setLastEventNote(`Brecha crítica: pasó ${ent.kind} sin bloqueo (-15% integridad).`);
              spawnBurst(cx, h - 10, '#ef4444', 16);
              popupsRef.current.push({
                x: cx,
                y: h - 28,
                text: `BRECHA ${ent.kind} -15%`,
                color: '#f87171',
                life: 0.9,
              });
              playErrorSfx(mutedRef.current);
              if (integrityRef.current <= 0) {
                setPhase('gameover');
                onSyncMatrix(HIT_ICON);
              }
            } else {
              scoreRef.current += 8;
              statsRef.current.allowedSafe += 1;
              setScore(scoreRef.current);
              setAllowedSafe(statsRef.current.allowedSafe);
              setLastEventNote(`Tráfico legítimo ${ent.kind} entregado (+8 pts).`);
              popupsRef.current.push({
                x: cx,
                y: h - 22,
                text: `+8 ${ent.kind} OK`,
                color: '#34d399',
                life: 0.65,
              });
              playSuccessSfx(mutedRef.current);
            }
            continue;
          }
          nextEntities.push(ent);
        }
        entitiesRef.current = nextEntities;
      }

      // Update particles & popups
      particlesRef.current = particlesRef.current
        .map((pt) => ({
          ...pt,
          x: pt.x + pt.vx * dt,
          y: pt.y + pt.vy * dt,
          life: pt.life - dt,
        }))
        .filter((pt) => pt.life > 0);
      popupsRef.current = popupsRef.current
        .map((pp) => ({ ...pp, y: pp.y - 28 * dt, life: pp.life - dt }))
        .filter((pp) => pp.life > 0);

      // Draw scene with optional micro-shake
      ctx.save();
      if (shakeRef.current > 0) {
        const mag = shakeRef.current * shakeRef.current * 7;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#091122');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle tactical grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;
      for (let gy = 40; gy < h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, h);
        ctx.stroke();
      }

      // Protected server bus zone at bottom
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, h - 26, w, 26);
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BUS INTERNO PROTEGIDO · IDEABOARD + RED LOCAL', w / 2, h - 10);

      // Lane header tags
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i === playerLaneRef.current ? 'rgba(59,130,246,0.14)' : 'transparent';
        ctx.fillRect(i * laneW, 0, laneW, h - 26);
        ctx.fillStyle = i === playerLaneRef.current ? '#93c5fd' : '#475569';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(`PUERTO ${i + 1}`, i * laneW + laneW / 2, 16);
      }

      // Draw falling packets with motion wake
      ctx.textBaseline = 'middle';
      for (const ent of entitiesRef.current) {
        const cx = ent.lane * laneW + laneW / 2;
        const wakeGrad = ctx.createLinearGradient(cx, ent.y - 46, cx, ent.y);
        wakeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        wakeGrad.addColorStop(1, ent.isThreat ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.32)');
        ctx.fillStyle = wakeGrad;
        ctx.fillRect(cx - 18, ent.y - 46, 36, 46);

        ctx.fillStyle = ent.isThreat ? '#dc2626' : '#059669';
        ctx.beginPath();
        ctx.roundRect(cx - 36, ent.y - 15, 72, 30, 7);
        ctx.fill();

        ctx.strokeStyle = ent.isThreat ? '#fca5a5' : '#6ee7b7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillText(`${ent.isThreat ? '▲' : '●'} ${ent.kind}`, cx, ent.y);
      }

      // Draw Firewall Shield (Player)
      const px = visualLaneXRef.current * laneW + laneW / 2;
      ctx.fillStyle = shieldFlashRef.current > 0 ? '#0284c7' : '#2563eb';
      ctx.beginPath();
      ctx.roundRect(px - 44, shieldY - 13, 88, 26, 8);
      ctx.fill();
      ctx.strokeStyle = shieldFlashRef.current > 0 ? '#bae6fd' : '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shield deflector arc
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.lineWidth = 2;
      ctx.arc(px, shieldY - 4, 46, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('FIREWALL', px, shieldY);

      // Particles & Floating popups
      for (const pt of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.font = '700 11px "JetBrains Mono", monospace';
      for (const pp of popupsRef.current) {
        ctx.globalAlpha = Math.max(0, pp.life);
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, pp.x, pp.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [phase, onSyncMatrix]);

  const accuracyPct = computeFirewallAccuracy({
    blockedThreats,
    missedThreats,
    allowedSafe,
    falsePositives,
  });
  const securityGrade = computeSecurityGrade(accuracyPct, score);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Firewall Interceptor · Inspección de Tráfico (IDS/IPS)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aprende a distinguir tráfico malicioso de sesiones cifradas reales usando Botón A/B, inclinación IMU o teclado.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              {phase === 'playing' ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reiniciar
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {phase === 'gameover' ? 'Jugar de nuevo' : 'Iniciar Partida'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canvas Stage + Clean Overlay for Title / Game Over */}
        <div className="relative mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            data-testid="firewall-canvas"
            className="block w-full bg-slate-950"
          />

          {phase !== 'playing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center text-white">
              <div className="font-display text-xl font-bold">
                {phase === 'gameover'
                  ? `Brecha en el Firewall · Rango ${securityGrade}`
                  : 'Firewall Interceptor · Defiende la Red'}
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
                {phase === 'gameover'
                  ? `Bloqueaste ${blockedThreats} ataques con ${accuracyPct}% de precisión y ${falsePositives} falsos positivos.`
                  : 'Bloquea amenazas rojas (▲ DDoS, Phish, Malware) y deja pasar tráfico verde cifrado (● TLS, SSH, HTTPS).'}
              </p>
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {phase === 'gameover' ? 'Reintentar Defensa' : 'Comenzar Simulación'}
              </button>
              <div className="mt-3 font-mono text-[11px] text-slate-400">
                Flechas / A-D · Botones físicos A y B · Inclinación IMU
              </div>
            </div>
          )}
        </div>

        {/* Live event explanation bar + controls */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Registro en vivo: </span>
          {lastEventNote}
        </div>

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

      {/* Right Column: Metrics + Live Educational Concept Card */}
      <div className="space-y-4 xl:col-span-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Métricas de Defensa
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              Rango {securityGrade}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400">Puntaje</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {score}
              </div>
            </div>
            <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400">Precisión</div>
              <div className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {accuracyPct}%
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Ataques bloqueados</div>
              <div className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {blockedThreats}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Falsos positivos</div>
              <div className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {falsePositives}
              </div>
            </div>
          </div>

          <div className="mt-4">
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
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Lección en Vivo · {activeLesson.fullName}
            </h3>
          </div>
          <div className="mt-2 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Impacto CIA: {activeLesson.ciaImpact}
          </div>
          <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
            {activeLesson.summary}
          </p>
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Regla de defensa: </span>
            <span className="text-slate-600 dark:text-slate-300">{activeLesson.defenseTip}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
