import type { ActiveTab } from '../lib/types';

interface AppFooterProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

const FOOTER_LINKS: Array<{ tab: ActiveTab; label: string }> = [
  { tab: 'soc', label: 'Monitor SOC' },
  { tab: 'ailab', label: 'Laboratorio IA' },
  { tab: 'optical', label: 'Sensores y Maker' },
  { tab: 'game', label: 'Juegos' },
  { tab: 'firmware', label: 'Firmware' },
];

export function AppFooter({ onNavigateTab }: AppFooterProps) {
  const handleNavigate = (tab: ActiveTab) => {
    onNavigateTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap">
          <span className="font-display font-semibold text-slate-800 dark:text-slate-200">
            IdeaSense CyberLab
          </span>
          <span aria-hidden="true">·</span>
          <span>MakerLab · Universidad CENFOTEC</span>
        </div>

        <nav
          aria-label="Accesos rápidos del pie de página"
          className="flex flex-wrap items-center gap-x-5 gap-y-1.5"
        >
          {FOOTER_LINKS.map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleNavigate(item.tab)}
              className="font-medium text-slate-600 transition-colors hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
          © 2026 MakerLab · Día de AI &amp; Cybersecurity
        </div>
      </div>
    </footer>
  );
}
