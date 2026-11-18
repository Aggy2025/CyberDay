import type { TelemetryPacket } from '../lib/types';
import { computeAccelMagnitude } from '../lib/cyberEngine';

interface BoardSchematicSvgProps {
  packet: TelemetryPacket;
  matrixPixels: number[];
  hasTamperAlert: boolean;
  hasOpticalAlert: boolean;
  hasThermalAlert: boolean;
}

export function BoardSchematicSvg({
  packet,
  matrixPixels,
  hasTamperAlert,
  hasOpticalAlert,
  hasThermalAlert,
}: BoardSchematicSvgProps) {
  const accelMag = computeAccelMagnitude(packet);
  const tiltX = Math.max(-14, Math.min(14, packet.ax * 12));
  const tiltY = Math.max(-14, Math.min(14, packet.ay * 12));

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <svg
        viewBox="0 0 360 220"
        className="w-full max-w-[360px]"
        role="img"
        aria-label="Esquema en vivo de la tarjeta IdeaBoard e IdeaSense Explorer"
      >
        {/* PCB Board Outline */}
        <rect
          x="30"
          y="16"
          width="300"
          height="188"
          rx="14"
          className="fill-slate-900 stroke-slate-700 dark:fill-slate-900 dark:stroke-slate-600"
          strokeWidth="2"
        />

        {/* USB-C Connector */}
        <rect x="14" y="92" width="20" height="36" rx="4" className="fill-slate-400 dark:fill-slate-500" />

        {/* Board Label */}
        <text
          x="48"
          y="38"
          className="fill-slate-300 text-[10px] font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          IdeaBoard ESP32 · IdeaSense Explorer
        </text>

        {/* 5x5 LED Matrix */}
        <g transform="translate(135, 52)">
          <rect
            x="-6"
            y="-6"
            width="102"
            height="102"
            rx="8"
            className="fill-slate-950 stroke-slate-700"
            strokeWidth="1.5"
          />
          {matrixPixels.slice(0, 25).map((on, idx) => {
            const row = Math.floor(idx / 5);
            const col = idx % 5;
            const cx = col * 19 + 7;
            const cy = row * 19 + 7;
            const activeColor = hasTamperAlert || hasThermalAlert ? '#ef4444' : '#38bdf8';
            return (
              <rect
                key={idx}
                x={cx - 6}
                y={cy - 6}
                width="12"
                height="12"
                rx="2.5"
                fill={on === 1 ? activeColor : '#1e293b'}
              />
            );
          })}
        </g>

        {/* Physical Buttons A & B */}
        <g transform="translate(50, 74)">
          <rect
            x="0"
            y="0"
            width="36"
            height="28"
            rx="6"
            fill={packet.ba === 1 ? '#2563eb' : '#1e293b'}
            stroke={packet.ba === 1 ? '#60a5fa' : '#475569'}
            strokeWidth="1.5"
          />
          <text x="18" y="18" textAnchor="middle" className="fill-white text-[11px] font-bold">
            A
          </text>

          <rect
            x="0"
            y="40"
            width="36"
            height="28"
            rx="6"
            fill={packet.bb === 1 ? '#2563eb' : '#1e293b'}
            stroke={packet.bb === 1 ? '#60a5fa' : '#475569'}
            strokeWidth="1.5"
          />
          <text x="18" y="58" textAnchor="middle" className="fill-white text-[11px] font-bold">
            B/C
          </text>
        </g>

        {/* LTR-303 Optical Sensor */}
        <g transform="translate(260, 56)">
          <rect
            x="0"
            y="0"
            width="54"
            height="36"
            rx="6"
            fill={hasOpticalAlert ? '#451a03' : '#0f172a'}
            stroke={hasOpticalAlert ? '#f59e0b' : '#475569'}
            strokeWidth="1.5"
          />
          <circle
            cx="27"
            cy="14"
            r="6"
            fill={hasOpticalAlert ? '#fbbf24' : '#38bdf8'}
            opacity={Math.min(1, Math.max(0.2, packet.l / 800))}
          />
          <text x="27" y="31" textAnchor="middle" className="fill-slate-300 text-[8px] font-mono">
            LTR-303
          </text>
        </g>

        {/* SHT30 Temp/Humidity Sensor */}
        <g transform="translate(260, 102)">
          <rect
            x="0"
            y="0"
            width="54"
            height="36"
            rx="6"
            fill={hasThermalAlert ? '#450a0a' : '#0f172a'}
            stroke={hasThermalAlert ? '#ef4444' : '#475569'}
            strokeWidth="1.5"
          />
          <text x="27" y="16" textAnchor="middle" className="fill-slate-100 text-[9px] font-mono">
            {packet.t.toFixed(1)}°C
          </text>
          <text x="27" y="30" textAnchor="middle" className="fill-slate-400 text-[8px] font-mono">
            SHT30
          </text>
        </g>

        {/* LSM6DS IMU Vector Widget */}
        <g transform="translate(260, 148)">
          <rect
            x="0"
            y="0"
            width="54"
            height="42"
            rx="6"
            fill={hasTamperAlert ? '#450a0a' : '#0f172a'}
            stroke={hasTamperAlert ? '#ef4444' : '#475569'}
            strokeWidth="1.5"
          />
          <circle cx="27" cy="18" r="10" fill="none" stroke="#334155" strokeWidth="1" />
          <circle
            cx={27 + tiltX * 0.5}
            cy={18 + tiltY * 0.5}
            r="3.5"
            fill={hasTamperAlert ? '#ef4444' : '#10b981'}
          />
          <text x="27" y="37" textAnchor="middle" className="fill-slate-300 text-[8px] font-mono">
            IMU {accelMag.toFixed(2)}g
          </text>
        </g>

        {/* Footer legend inside board */}
        <text x="48" y="186" className="fill-slate-400 text-[9px] font-mono">
          I2C · NUS 25 Hz · Luz {packet.l} cuentas
        </text>
      </svg>
    </div>
  );
}
