import { Bluetooth, Menu, Moon, Play, Square, Sun } from 'lucide-react';
import type { ActiveTab, ConnectionMode } from '../lib/types';

interface TopHeaderProps {
  activeTab: ActiveTab;
  connectionMode: ConnectionMode;
  deviceName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onConnectBle: () => void;
  onDisconnectBle: () => void;
  onToggleDemo: () => void;
  onOpenMobileMenu: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  soc: 'Monitor SOC y Telemetría Física',
  twin3d: 'Gemelo Digital 3D · IdeaBoard',
  ailab: 'Laboratorio de Edge AI (k-NN)',
  game: 'Firewall Interceptor 2D',
  audit: 'Auditoría CSV y Copiloto Gemini',
  chat: 'Chat SOC Multi-Turno (Gemini Gratuito)',
  firmware: 'Firmware CircuitPython y Guía',
};

export function TopHeader({
  activeTab,
  connectionMode,
  deviceName,
  isDark,
  onToggleTheme,
  onConnectBle,
  onDisconnectBle,
  onToggleDemo,
  onOpenMobileMenu,
}: TopHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú lateral"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="font-display truncate text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
          {TAB_TITLES[activeTab]}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div
          className="hidden items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 md:flex"
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connectionMode === 'ble'
                ? 'bg-emerald-500'
                : connectionMode === 'demo'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
            }`}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">
            {connectionMode === 'ble'
              ? `BLE: ${deviceName}`
              : connectionMode === 'demo'
                ? 'Simulación 25 Hz activa'
                : 'Sin conexión'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {connectionMode !== 'ble' && (
          <button
            type="button"
            onClick={onToggleDemo}
            aria-label={connectionMode === 'demo' ? 'Detener Demo' : 'Modo Demo'}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap sm:px-3 ${
              connectionMode === 'demo'
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {connectionMode === 'demo' ? (
              <>
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Detener Demo</span>
                <span className="sm:hidden">Demo</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Modo Demo</span>
                <span className="sm:hidden">Demo</span>
              </>
            )}
          </button>
        )}

        {connectionMode === 'ble' ? (
          <button
            type="button"
            onClick={onDisconnectBle}
            aria-label="Desconectar BLE"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap sm:px-3.5"
          >
            <Bluetooth className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Desconectar BLE</span>
            <span className="sm:hidden">BLE</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnectBle}
            aria-label="Conectar IdeaBoard"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap sm:px-3.5"
          >
            <Bluetooth className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Conectar IdeaBoard</span>
            <span className="sm:hidden">Conectar</span>
          </button>
        )}
      </div>
    </header>
  );
}
