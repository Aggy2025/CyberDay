import { useState } from 'react';
import { KeyRound, Move, Sun, Thermometer } from 'lucide-react';
import { computeAccelMagnitude, computeGyroMagnitude } from '../lib/cyberEngine';
import type { SecurityThresholds, TelemetryPacket } from '../lib/types';
import { ImuSensorGuide } from './ImuSensorGuide';
import { MfaButtonsGuide } from './MfaButtonsGuide';
import { OpticalSensorGuide } from './OpticalSensorGuide';
import { ThermalSensorGuide } from './ThermalSensorGuide';

interface SensorsGuideViewProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
}

type SensorTabId = 'light' | 'imu' | 'thermal' | 'mfa';

export function SensorsGuideView({
  latestPacket,
  thresholds,
  telemetryActive,
}: SensorsGuideViewProps) {
  const [selectedSensor, setSelectedSensor] = useState<SensorTabId>('light');

  const accelDelta = Math.abs(computeAccelMagnitude(latestPacket) - 1.0);
  const gyroMag = computeGyroMagnitude(latestPacket);

  const tabs: Array<{
    id: SensorTabId;
    label: string;
    liveSummary: string;
    icon: typeof Sun;
  }> = [
    {
      id: 'light',
      label: '1. Sensor de Luz (LTR-303 / LDR)',
      liveSummary: `${latestPacket.l} cuentas`,
      icon: Sun,
    },
    {
      id: 'imu',
      label: '2. Acelerómetro y Giroscopio (IMU)',
      liveSummary: `Δ${accelDelta.toFixed(2)}g · ${gyroMag.toFixed(0)} dps`,
      icon: Move,
    },
    {
      id: 'thermal',
      label: '3. Térmico y Humedad (SHT30)',
      liveSummary: `${latestPacket.t.toFixed(1)} °C · ${latestPacket.h.toFixed(0)}%`,
      icon: Thermometer,
    },
    {
      id: 'mfa',
      label: '4. Botones Físicos (MFA)',
      liveSummary: `A:${latestPacket.ba} · B:${latestPacket.bb}`,
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-6" data-testid="sensors-guide-view">
      {/* Segmented Sensor Selector with compact live telemetry summary */}
      <div
        className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4"
        role="tablist"
        aria-label="Selector de sensor físico para explorar"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = selectedSensor === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedSensor(tab.id)}
              className={`flex flex-col items-start gap-1 rounded-lg px-3.5 py-2.5 text-left transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex w-full items-center gap-2 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </div>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                En vivo: {tab.liveSummary}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSensor === 'light' && (
        <OpticalSensorGuide
          latestPacket={latestPacket}
          thresholds={thresholds}
          telemetryActive={telemetryActive}
        />
      )}
      {selectedSensor === 'imu' && (
        <ImuSensorGuide
          latestPacket={latestPacket}
          thresholds={thresholds}
          telemetryActive={telemetryActive}
        />
      )}
      {selectedSensor === 'thermal' && (
        <ThermalSensorGuide
          latestPacket={latestPacket}
          thresholds={thresholds}
          telemetryActive={telemetryActive}
        />
      )}
      {selectedSensor === 'mfa' && (
        <MfaButtonsGuide
          latestPacket={latestPacket}
          thresholds={thresholds}
          telemetryActive={telemetryActive}
        />
      )}
    </div>
  );
}
