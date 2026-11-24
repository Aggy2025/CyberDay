import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Cable,
  CheckCircle2,
  Cpu,
  Layers,
  PlusCircle,
  Search,
} from 'lucide-react';
import {
  BOARD_PROFILES,
  filterHardwareComponents,
  filterMakerTerms,
  HARDWARE_COMPONENT_MAP,
  MAKER_DICTIONARY_TERMS,
  type DictionaryCategory,
  type HardwareBoardRole,
  type UsageStatus,
} from '../lib/makerDictionary';
import { computeAccelMagnitude } from '../lib/cyberEngine';
import type { ActiveTab, TelemetryPacket } from '../lib/types';

export type DictionaryTargetSensor = 'light' | 'imu' | 'thermal' | 'mfa';

interface MakerDictionarySectionProps {
  latestPacket: TelemetryPacket;
  onJumpToSensor: (sensor: DictionaryTargetSensor) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

const BOARD_FILTERS: Array<{ id: 'all' | HardwareBoardRole; label: string }> = [
  { id: 'all', label: 'Ambas placas (10)' },
  { id: 'ideaboard', label: 'IdeaBoard · MCU (5)' },
  { id: 'ideasense', label: 'IdeaSense · PCB (5)' },
];

const USAGE_FILTERS: Array<{ id: 'all' | UsageStatus; label: string }> = [
  { id: 'all', label: 'Todo el hardware' },
  { id: 'active', label: 'Usado en este ejemplo (8)' },
  { id: 'expansion', label: 'Libre para expandir (2)' },
];

const TERM_CATEGORIES: Array<{ id: 'all' | DictionaryCategory; label: string }> = [
  { id: 'all', label: 'Todos los conceptos' },
  { id: 'hardware', label: 'Microcontrolador y PCB' },
  { id: 'protocols', label: 'Buses y Protocolos' },
  { id: 'firmware', label: 'Firmware e IDEs' },
  { id: 'cyber_ai', label: 'Ciberseguridad e IA' },
];

export function MakerDictionarySection({
  latestPacket,
  onJumpToSensor,
  onNavigateTab,
}: MakerDictionarySectionProps) {
  const [boardFilter, setBoardFilter] = useState<'all' | HardwareBoardRole>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | UsageStatus>('all');
  const [termCategory, setTermCategory] = useState<'all' | DictionaryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = useMemo(
    () => filterHardwareComponents(HARDWARE_COMPONENT_MAP, boardFilter, usageFilter),
    [boardFilter, usageFilter],
  );

  const filteredTerms = useMemo(
    () => filterMakerTerms(MAKER_DICTIONARY_TERMS, termCategory, searchQuery),
    [termCategory, searchQuery],
  );

  const accelMag = computeAccelMagnitude(latestPacket);

  const liveValueByComponent: Record<string, string> = {
    'imu-lsm6ds': `|a|=${accelMag.toFixed(2)} g`,
    'light-ltr303': `${latestPacket.l} cuentas`,
    'env-sht30': `${latestPacket.t.toFixed(1)} °C · ${latestPacket.h.toFixed(0)}%`,
    'buttons-abc': `ba=${latestPacket.ba} · bb=${latestPacket.bb}`,
  };

  return (
    <div className="space-y-6" data-testid="maker-dictionary-section">
      {/* 1. Core Architectural Difference: IdeaBoard (MCU) vs IdeaSense Explorer (PCB) */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Arquitectura del ejemplo: IdeaBoard e IdeaSense Explorer"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Arquitectura Real · Repositorio Universidad CENFOTEC
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Universidad-Cenfotec/IdeaSense</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              ¿Qué es la IdeaBoard (Microcontrolador) y qué es la IdeaSense Explorer (PCB)?
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              En el enfoque Maker trabajamos con dos placas complementarias conectadas sin soldadura mediante un cable Qwiic:
              una procesa y se comunica por Bluetooth (<strong className="text-slate-900 dark:text-slate-100">IdeaBoard</strong>),
              y la otra aporta los sensores físicos y la matriz LED (<strong className="text-slate-900 dark:text-slate-100">IdeaSense Explorer</strong>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('twin3d')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Ver placas en Gemelo 3D
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('firmware')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Ver code.py y guía IdeaCode
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(['ideaboard', 'ideasense'] as const).map((roleKey) => {
            const profile = BOARD_PROFILES[roleKey];
            const isMcu = roleKey === 'ideaboard';
            return (
              <article
                key={roleKey}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                      {isMcu ? (
                        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      ) : (
                        <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      )}
                      {profile.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {profile.origin}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                    {profile.subtitle}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {profile.summary}
                  </p>

                  <dl className="mt-3 divide-y divide-slate-200 border-t border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
                    {profile.specs.map((spec) => (
                      <div key={spec.label} className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-3 sm:gap-2">
                        <dt className="font-medium text-slate-500 dark:text-slate-400">{spec.label}</dt>
                        <dd className="font-mono text-[11px] text-slate-800 dark:text-slate-200 sm:col-span-2">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-200">Nota técnica:</strong>{' '}
                  {profile.programmingNote}
                </p>
              </article>
            );
          })}
        </div>

        {/* Physical Data Pipeline Strip */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-xs text-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-400">
              <Cable className="h-3.5 w-3.5" aria-hidden="true" />
              Flujo físico en este ejemplo:
            </span>
            <span>IdeaSense PCB (0x29 · 0x44 · 0x6A · 0x70)</span>
            <span className="text-slate-500" aria-hidden="true">→</span>
            <span className="text-amber-300">Cable Qwiic I2C (3.3 V)</span>
            <span className="text-slate-500" aria-hidden="true">→</span>
            <span>IdeaBoard ESP32 (code.py)</span>
            <span className="text-slate-500" aria-hidden="true">→</span>
            <span className="text-emerald-400">Web Bluetooth NUS (25 Hz)</span>
            <span className="text-slate-500" aria-hidden="true">→</span>
            <span>SOC · Gemelo 3D · Edge AI · Juegos</span>
          </div>
        </div>
      </section>

      {/* 2. Component Usage Map: What is actually used in this CyberLab example */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Componentes utilizados en este ejemplo de ciberseguridad e IA"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              ¿Qué componentes reales se usan en este ejemplo?
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Inspecciona cada chip de la IdeaBoard y la IdeaSense Explorer, su dirección I2C/pin y si está activo aquí o libre para ampliar en el MakerLab.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Filtrar por placa"
            >
              {BOARD_FILTERS.map((f) => {
                const active = boardFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBoardFilter(f.id)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div
              className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Filtrar por estado de uso"
            >
              {USAGE_FILTERS.map((f) => {
                const active = usageFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUsageFilter(f.id)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredComponents.map((item) => {
            const isActive = item.status === 'active';
            const liveBadge = liveValueByComponent[item.id];
            const targetSensor: DictionaryTargetSensor | null =
              item.id === 'light-ltr303'
                ? 'light'
                : item.id === 'imu-lsm6ds'
                  ? 'imu'
                  : item.id === 'env-sht30'
                    ? 'thermal'
                    : item.id === 'buttons-abc'
                      ? 'mfa'
                      : null;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                      {isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      ) : (
                        <PlusCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      )}
                      <span>{item.name}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-medium ${
                        isActive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isActive ? 'Activo en CyberLab' : 'Expansión MakerLab'}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{item.board === 'ideaboard' ? 'IdeaBoard (MCU)' : 'IdeaSense (PCB)'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.chipOrPin}</span>
                    {liveBadge && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                          {liveBadge}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                  <p className="mt-1.5 leading-relaxed text-slate-700 dark:text-slate-200">
                    <strong className="font-semibold">En este proyecto:</strong> {item.cyberLabUsage}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    Canal: {item.telemetryField}
                  </span>
                  {targetSensor && (
                    <button
                      type="button"
                      onClick={() => onJumpToSensor(targetSensor)}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                    >
                      Abrir diagrama interactivo
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Searchable Maker Concepts & Terminology Dictionary */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Diccionario de conceptos Maker, electrónica e inteligencia artificial"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Diccionario de Conceptos Maker, Hardware e IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Referencia rápida para estudiantes sobre microcontroladores, PCBs, buses digitales y defensa física.
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar concepto (ej. I2C, PCB, 0x70)..."
              aria-label="Buscar término en el diccionario Maker"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar conceptos por categoría"
        >
          {TERM_CATEGORIES.map((cat) => {
            const active = termCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTermCategory(cat.id)}
                aria-pressed={active}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {filteredTerms.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No se encontraron conceptos que coincidan con «{searchQuery}». Prueba con términos como I2C, BLE, ESP32 o k-NN.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTerms.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {entry.categoryLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{entry.shortTag}</span>
                  </div>
                  <h3 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    {entry.term}
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
                    {entry.definition}
                  </p>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  <strong>Uso en esta plataforma:</strong> {entry.inThisProject}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
