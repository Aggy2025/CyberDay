import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  KeyRound,
  Move,
  Play,
  Sun,
  Thermometer,
  Wrench,
} from 'lucide-react';
import { computeAccelMagnitude, computeGyroMagnitude } from '../lib/cyberEngine';
import { MAKERLAB_USE_CASES } from '../lib/makerApplications';
import type { ActiveTab, CyberScenario, SecurityThresholds, TelemetryPacket } from '../lib/types';
import { ImuSensorGuide } from './ImuSensorGuide';
import { MakerDictionarySection } from './MakerDictionarySection';
import { MfaButtonsGuide } from './MfaButtonsGuide';
import { OpticalSensorGuide } from './OpticalSensorGuide';
import { ThermalSensorGuide } from './ThermalSensorGuide';

interface SensorsGuideViewProps {
  latestPacket: TelemetryPacket;
  thresholds: SecurityThresholds;
  telemetryActive: boolean;
  onTestScenarioInSoc: (scenario: CyberScenario) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

type SensorTabId = 'dictionary' | 'light' | 'imu' | 'thermal' | 'mfa';

export function SensorsGuideView({
  latestPacket,
  thresholds,
  telemetryActive,
  onTestScenarioInSoc,
  onNavigateTab,
}: SensorsGuideViewProps) {
  const [selectedSensor, setSelectedSensor] = useState<SensorTabId>('dictionary');

  const accelDelta = Math.abs(computeAccelMagnitude(latestPacket) - 1.0);
  const gyroMag = computeGyroMagnitude(latestPacket);
  const makerCase = selectedSensor === 'dictionary' ? null : MAKERLAB_USE_CASES[selectedSensor];

  const tabs: Array<{
    id: SensorTabId;
    label: string;
    liveSummary: string;
    icon: typeof Sun;
  }> = [
    {
      id: 'dictionary',
      label: '0. Diccionario Maker',
      liveSummary: 'IdeaBoard + IdeaSense',
      icon: BookOpen,
    },
    {
      id: 'light',
      label: '1. Luz (LTR-303)',
      liveSummary: `${latestPacket.l} cuentas · 0x29`,
      icon: Sun,
    },
    {
      id: 'imu',
      label: '2. IMU (LSM6DS3TR-C)',
      liveSummary: `Δ${accelDelta.toFixed(2)}g · ${gyroMag.toFixed(0)} dps`,
      icon: Move,
    },
    {
      id: 'thermal',
      label: '3. Térmico (SHT30)',
      liveSummary: `${latestPacket.t.toFixed(1)} °C · ${latestPacket.h.toFixed(0)}%`,
      icon: Thermometer,
    },
    {
      id: 'mfa',
      label: '4. Botones A/B/C (MFA)',
      liveSummary: `ba:${latestPacket.ba} · bb:${latestPacket.bb}`,
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-6" data-testid="sensors-guide-view">
      {/* Segmented Sensor & Maker Dictionary Selector */}
      <div
        className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        role="tablist"
        aria-label="Selector de diccionario Maker y sensores físicos"
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
                {tab.id === 'dictionary' ? tab.liveSummary : `En vivo: ${tab.liveSummary}`}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSensor === 'dictionary' && (
        <MakerDictionarySection
          latestPacket={latestPacket}
          onJumpToSensor={(sensor) => setSelectedSensor(sensor)}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Real-World MakerLab Application Blueprint for the Selected Sensor */}
      {makerCase && (
        <section
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          aria-label="Aplicación real en MakerLab de ciberseguridad e IA"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Aplicación Real MakerLab
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{makerCase.chipset}</span>
              </div>
              <h2 className="mt-1 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {makerCase.realWorldTitle}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onTestScenarioInSoc(makerCase.recommendedScenario)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Probar escenario en SOC
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('ailab')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Entrenar en Laboratorio IA
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                01. Dónde se aplica en industria
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                {makerCase.sectorContext}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                02. Rol del microcontrolador (ESP32)
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                {makerCase.microcontrollerRole}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                03. Rol de la IA en el borde (k-NN)
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                {makerCase.edgeAiRole}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Wrench className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                04. Prototipo para el MakerLab
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                {makerCase.makerLabProject}
              </p>
            </div>
          </div>
        </section>
      )}

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
