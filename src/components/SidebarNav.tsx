import {
  Activity,
  Box,
  BrainCircuit,
  Cpu,
  Eye,
  FileSpreadsheet,
  Gamepad2,
  MessageSquare,
  Shield,
  X,
} from 'lucide-react';
import type { ActiveTab } from '../lib/types';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  alertCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: typeof Activity;
}> = [
  {
    id: 'soc',
    label: 'Monitor SOC',
    sublabel: 'Telemetría 25 Hz y Tendencia IA',
    icon: Activity,
  },
  {
    id: 'twin3d',
    label: 'Gemelo 3D',
    sublabel: 'Escena Three.js interactiva',
    icon: Box,
  },
  {
    id: 'ailab',
    label: 'Laboratorio IA',
    sublabel: 'Clasificador k-NN y Z-Score',
    icon: BrainCircuit,
  },
  {
    id: 'game',
    label: 'Juegos CyberLab',
    sublabel: '3 minijuegos con hardware',
    icon: Gamepad2,
  },
  {
    id: 'optical',
    label: 'Guía de Sensores',
    sublabel: 'Luz, IMU, SHT30 y Botones',
    icon: Eye,
  },
  {
    id: 'audit',
    label: 'Auditoría y Gemini',
    sublabel: 'Registro CSV y Análisis',
    icon: FileSpreadsheet,
  },
  {
    id: 'chat',
    label: 'Chat SOC (Gemini)',
    sublabel: 'Asistente multi-turno gratis',
    icon: MessageSquare,
  },
  {
    id: 'firmware',
    label: 'Firmware y Guía',
    sublabel: 'code.py y guión del evento',
    icon: Cpu,
  },
];

export function SidebarNav({
  activeTab,
  onSelectTab,
  alertCount,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 lg:pointer-events-auto ${
          mobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                IdeaSense CyberLab
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Universidad CENFOTEC
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú lateral"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
                    {item.id === 'soc' && alertCount > 0 && (
                      <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">
                        {alertCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.sublabel}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Día de AI &amp; Cybersecurity
          </p>
          <p className="mt-1 leading-relaxed">
            Hardware: IdeaBoard ESP32 + IdeaSense Explorer (IMU, SHT30, LTR-303, Matriz 5×5).
          </p>
        </div>
      </aside>
    </>
  );
}
