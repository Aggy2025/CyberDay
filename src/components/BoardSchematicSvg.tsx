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
  const tiltX = Math.max(-7, Math.min(7, packet.ax * 6));
  const tiltY = Math.max(-7, Math.min(7, packet.ay * 6));

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <svg
        viewBox="0 0 365 270"
        className="w-full max-w-[365px]"
        role="img"
        aria-label="Esquema en vivo de la tarjeta IdeaSense Explorer conectada a la IdeaBoard"
      >
        {/* Qwiic 4-wire cable exiting Explorer right connector into IdeaBoard black Qwiic port */}
        <g fill="none" strokeWidth="2.2" strokeLinecap="round">
          <path d="M 214 70 C 242 70, 260 158, 294 152" stroke="#1e293b" />
          <path d="M 214 75 C 240 75, 257 162, 298 152" stroke="#ef4444" />
          <path d="M 214 80 C 238 80, 254 166, 302 152" stroke="#facc15" />
          <path d="M 214 85 C 236 85, 251 170, 306 152" stroke="#e2e8f0" />
        </g>

        {/* Companion IdeaBoard (CRCibernética ESP32) matching photo */}
        <g transform="translate(242, 82)">
          {/* Matte-black horizontal PCB */}
          <rect
            x="0"
            y="0"
            width="114"
            height="72"
            rx="6"
            fill="#14161b"
            stroke="#334155"
            strokeWidth="1.4"
          />
          {/* 4 corner M3 holes */}
          {[
            [7, 7],
            [107, 7],
            [7, 65],
            [107, 65],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="3" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
          ))}
          {/* USB-C Port (left) */}
          <rect x="-4" y="25" width="14" height="16" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
          {/* Iconic Green Vin Screw Terminal (bottom-left) */}
          <rect x="6" y="46" width="16" height="19" rx="2" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
          <circle cx="14" cy="51.5" r="2.2" fill="#cbd5e1" />
          <circle cx="14" cy="59.5" r="2.2" fill="#cbd5e1" />
          {/* Top & Bottom GPIO Pin Header Banks */}
          <rect x="52" y="4" width="38" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.7" />
          <rect x="52" y="59" width="38" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.7" />
          {/* ESP32-WROOM-32E Shield Can (right) */}
          <rect x="68" y="18" width="36" height="32" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <rect x="70" y="20" width="24" height="28" rx="1.5" fill="#cbd5e1" />
          {/* NeoPixel RGB LED (IO02) white frame */}
          <rect x="48" y="29" width="11" height="11" rx="1.5" fill="#f8fafc" />
          <circle
            cx="53.5"
            cy="34.5"
            r="3.2"
            fill={hasTamperAlert || hasThermalAlert ? '#ef4444' : hasOpticalAlert ? '#f59e0b' : '#10b981'}
          />
          {/* Black Qwiic Port (bottom edge) */}
          <rect x="52" y="66" width="16" height="7" rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.7" />
          <text x="57" y="83" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[7px] font-mono">
            IdeaBoard ESP32
          </text>
        </g>

        {/* Authentic IdeaSense Explorer Silhouette (Matte Black PCB + 4 Mounting Ears) */}
        <path
          d="M 42 14
             H 218
             A 10 10 0 0 1 228 24
             V 48
             A 10 10 0 0 1 218 58
             H 206
             V 204
             H 218
             A 10 10 0 0 1 228 214
             V 238
             A 10 10 0 0 1 218 248
             H 42
             A 10 10 0 0 1 32 238
             V 214
             A 10 10 0 0 1 42 204
             H 54
             V 58
             H 42
             A 10 10 0 0 1 32 48
             V 24
             A 10 10 0 0 1 42 14 Z"
          fill="#14161b"
          stroke="#334155"
          strokeWidth="1.8"
        />

        {/* 4 Plated M3 Corner Mounting Holes */}
        {[
          [46, 30],
          [214, 30],
          [46, 232],
          [214, 232],
        ].map(([cx, cy], idx) => (
          <g key={idx}>
            <circle cx={cx} cy={cy} r="9" fill="none" stroke="#eab308" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="5.5" className="fill-slate-50 dark:fill-slate-950" />
          </g>
        ))}

        {/* TOP SENSOR ISLAND: L (LTR-303), IMU (Y/X/Z), T/H (SHT30) */}
        {/* LTR-303 Optical Sensor ("L") */}
        <g transform="translate(66, 22)">
          <text x="8" y="10" textAnchor="middle" className="fill-white text-[9px] font-bold">
            L
          </text>
          <rect
            x="2"
            y="14"
            width="14"
            height="14"
            rx="2"
            fill={hasOpticalAlert ? '#451a03' : '#1e293b'}
            stroke={hasOpticalAlert ? '#f59e0b' : '#38bdf8'}
            strokeWidth="1.2"
          />
          <circle
            cx="9"
            cy="21"
            r="3.2"
            fill={hasOpticalAlert ? '#fbbf24' : '#38bdf8'}
            opacity={Math.min(1, Math.max(0.25, packet.l / 800))}
          />
        </g>

        {/* LSM6DS IMU + Y/X/Z Axis Diagram */}
        <g transform="translate(106, 20)">
          <rect
            x="10"
            y="2"
            width="14"
            height="12"
            rx="2"
            fill={hasTamperAlert ? '#7f1d1d' : '#1e293b'}
            stroke={hasTamperAlert ? '#ef4444' : '#10b981'}
            strokeWidth="1.2"
          />
          {/* Silkscreen Y ↑ X → Z ⊙ */}
          <text x="17" y="12" textAnchor="middle" className="fill-white text-[7px] font-bold">
            Y
          </text>
          <circle
            cx={17 + tiltX * 0.4}
            cy={25 + tiltY * 0.4}
            r="5"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="1.2"
          />
          <circle
            cx={17 + tiltX * 0.4}
            cy={25 + tiltY * 0.4}
            r="1.8"
            fill={hasTamperAlert ? '#ef4444' : '#10b981'}
          />
          <line x1="22" y1="25" x2="36" y2="25" stroke="#f8fafc" strokeWidth="1.2" />
          <text x="41" y="28" className="fill-white text-[7px] font-bold">
            X
          </text>
          <text x="4" y="28" className="fill-white text-[7px] font-bold">
            Z
          </text>
        </g>

        {/* SHT30 Temp & Humidity ("T/H") */}
        <g transform="translate(160, 22)">
          <text x="14" y="10" textAnchor="middle" className="fill-white text-[8px] font-bold">
            T/H
          </text>
          <rect
            x="7"
            y="14"
            width="14"
            height="14"
            rx="2"
            fill={hasThermalAlert ? '#ef4444' : '#e2e8f0'}
            stroke={hasThermalAlert ? '#fca5a5' : '#64748b'}
            strokeWidth="1.2"
          />
        </g>

        {/* Dual White Qwiic Connectors (left & right) */}
        <rect x="46" y="64" width="22" height="28" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
        <rect x="192" y="64" width="22" height="28" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />

        {/* HT16K33 Wide 28-pin IC */}
        <g transform="translate(82, 62)">
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <rect x={8 + i * 8.5} y="-3" width="3" height="4" fill="#cbd5e1" />
              <rect x={8 + i * 8.5} y="31" width="3" height="4" fill="#cbd5e1" />
            </g>
          ))}
          <rect x="0" y="0" width="96" height="32" rx="3" fill="#090d16" stroke="#334155" strokeWidth="1" />
          <text x="48" y="19" textAnchor="middle" className="fill-slate-400 text-[8px] font-mono">
            HT16K33
          </text>
        </g>

        {/* Vertical Silkscreen Labels: "Explorer" (left) & "ideaSense" (right) */}
        <text
          x="74"
          y="150"
          textAnchor="middle"
          transform="rotate(-90 74 150)"
          className="fill-white text-[13px] font-bold italic"
        >
          Explorer
        </text>
        <text
          x="186"
          y="150"
          textAnchor="middle"
          transform="rotate(-90 186 150)"
          className="fill-white text-[13px] font-bold italic"
        >
          ideaSense
        </text>

        {/* 5x5 SMD LED Matrix directly on PCB */}
        <g transform="translate(90, 108)">
          {matrixPixels.slice(0, 25).map((on, idx) => {
            const row = Math.floor(idx / 5);
            const col = idx % 5;
            const cx = col * 17 + 6;
            const cy = row * 17 + 6;
            const activeColor = hasTamperAlert || hasThermalAlert ? '#ef4444' : '#38bdf8';
            return (
              <g key={idx}>
                <rect x={cx - 6} y={cy - 4.5} width="12" height="9" rx="1.5" fill="#cbd5e1" />
                <rect
                  x={cx - 4.2}
                  y={cy - 3}
                  width="8.4"
                  height="6"
                  rx="1"
                  fill={on === 1 ? activeColor : '#334155'}
                />
              </g>
            );
          })}
        </g>

        {/* Three Tactile Pushbuttons A, B, C along bottom */}
        {[
          { label: 'A', x: 84, pressed: packet.ba === 1 },
          { label: 'B', x: 120, pressed: packet.bb === 1 },
          { label: 'C', x: 156, pressed: packet.bb === 1 },
        ].map((btn) => (
          <g key={btn.label} transform={`translate(${btn.x}, 206)`}>
            <rect
              x="0"
              y="0"
              width="20"
              height="20"
              rx="3"
              fill="#cbd5e1"
              stroke="#475569"
              strokeWidth="1"
            />
            <circle
              cx="10"
              cy="10"
              r="5.5"
              fill={btn.pressed ? '#38bdf8' : '#1e293b'}
            />
            <text x="10" y="32" textAnchor="middle" className="fill-white text-[10px] font-bold">
              {btn.label}
            </text>
          </g>
        ))}

        {/* Live Telemetry Caption */}
        <text x="160" y="264" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[9px] font-mono">
          I2C · Luz {packet.l} · Temp {packet.t.toFixed(1)}°C · IMU {accelMag.toFixed(2)}g
        </text>
      </svg>
    </div>
  );
}
