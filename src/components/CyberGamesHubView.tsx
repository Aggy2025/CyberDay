import { useState } from 'react';
import { Eye, KeyRound, Shield } from 'lucide-react';
import type { TelemetryPacket } from '../lib/types';
import { FirewallGameView } from './FirewallGameView';
import { MfaBruteDefenseGame } from './MfaBruteDefenseGame';
import { OpticalDecoderGame } from './OpticalDecoderGame';

interface CyberGamesHubViewProps {
  latestPacket: TelemetryPacket;
  onSyncMatrix: (pixels: number[]) => void;
}

type GameId = 'firewall' | 'optical' | 'mfa';

export function CyberGamesHubView({ latestPacket, onSyncMatrix }: CyberGamesHubViewProps) {
  const [selectedGame, setSelectedGame] = useState<GameId>('firewall');

  const games: Array<{ id: GameId; label: string; icon: typeof Shield }> = [
    { id: 'firewall', label: '1. Firewall Interceptor', icon: Shield },
    { id: 'optical', label: '2. Decodificador Óptico', icon: Eye },
    { id: 'mfa', label: '3. Defensa MFA', icon: KeyRound },
  ];

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
        aria-label="Selector de juegos de ciberseguridad"
      >
        {games.map((g) => {
          const Icon = g.icon;
          const active = selectedGame === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedGame(g.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {g.label}
            </button>
          );
        })}
      </div>

      {selectedGame === 'firewall' && (
        <FirewallGameView latestPacket={latestPacket} onSyncMatrix={onSyncMatrix} />
      )}
      {selectedGame === 'optical' && (
        <OpticalDecoderGame latestPacket={latestPacket} onSyncMatrix={onSyncMatrix} />
      )}
      {selectedGame === 'mfa' && (
        <MfaBruteDefenseGame latestPacket={latestPacket} onSyncMatrix={onSyncMatrix} />
      )}
    </div>
  );
}
