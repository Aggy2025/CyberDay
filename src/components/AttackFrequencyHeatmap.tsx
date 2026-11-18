import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { buildAlertHeatmapMatrix } from '../lib/cyberEngine';
import type { HeatmapGroupingMode, SecurityAlert } from '../lib/types';

interface AttackFrequencyHeatmapProps {
  alerts: SecurityAlert[];
}

function getHeatCellClasses(count: number, maxVal: number): string {
  if (count === 0) {
    return 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-950/60 dark:text-slate-600 dark:border-slate-800';
  }
  const ratio = maxVal > 0 ? count / maxVal : 1;
  if (ratio >= 0.75) {
    return 'bg-red-600 text-white border-red-700 dark:bg-red-600 dark:text-white dark:border-red-500';
  }
  if (ratio >= 0.45) {
    return 'bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-400';
  }
  return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800';
}

export function AttackFrequencyHeatmap({ alerts }: AttackFrequencyHeatmapProps) {
  const [grouping, setGrouping] = useState<HeatmapGroupingMode>('type');
  const [selectedCell, setSelectedCell] = useState<{
    rowLabel: string;
    bucketLabel: string;
    count: number;
    latestDetail: string | null;
  } | null>(null);

  const matrix = useMemo(() => {
    const refNow = alerts.length > 0 ? Math.max(Date.now(), alerts[0].ts) : Date.now();
    return buildAlertHeatmapMatrix(alerts, grouping, refNow, 8, 15000);
  }, [alerts, grouping]);

  return (
    <section
      aria-label="Mapa de calor de frecuencia de ataques físicos"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      data-testid="soc-attack-heatmap"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Mapa de Calor de Frecuencia de Ataques Físicos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribución temporal del historial de alertas SOC ({matrix.totalAlerts} eventos registrados en ventanas de 15 s).
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label="Agrupación del mapa de calor"
        >
          <button
            type="button"
            onClick={() => setGrouping('type')}
            aria-pressed={grouping === 'type'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              grouping === 'type'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Por tipo de ataque
          </button>
          <button
            type="button"
            onClick={() => setGrouping('location')}
            aria-pressed={grouping === 'location'}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              grouping === 'location'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Por ubicación / sensor
          </button>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[540px]">
          <div className="grid grid-cols-[190px_repeat(8,minmax(0,1fr))_58px] items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <div className="px-1">
              {grouping === 'type' ? 'Categoría de amenaza' : 'Ubicación física'}
            </div>
            {matrix.buckets.map((b) => (
              <div key={b} className="text-center font-mono tabular-nums">
                {b}
              </div>
            ))}
            <div className="text-right font-mono">Total</div>
          </div>

          <div className="mt-2 space-y-1.5">
            {matrix.rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[190px_repeat(8,minmax(0,1fr))_58px] items-center gap-1.5"
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {row.label}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {row.sublabel}
                  </div>
                </div>

                {row.cells.map((count, colIdx) => (
                  <button
                    key={`${row.key}-${colIdx}`}
                    type="button"
                    onClick={() =>
                      setSelectedCell({
                        rowLabel: row.label,
                        bucketLabel: matrix.buckets[colIdx],
                        count,
                        latestDetail: row.latestDetail,
                      })
                    }
                    aria-label={`${row.label} en ${matrix.buckets[colIdx]}: ${count} alertas`}
                    className={`flex h-9 items-center justify-center rounded-md border font-mono text-xs font-semibold transition-transform hover:scale-[1.03] tabular-nums ${getHeatCellClasses(
                      count,
                      matrix.maxCellValue,
                    )}`}
                  >
                    {count}
                  </button>
                ))}

                <div className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {row.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + Selected Cell Inspection */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <span className="font-medium">Frecuencia:</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950" aria-hidden="true" />
            0 (Sin eventos)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-950" aria-hidden="true" />
            Baja
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-orange-500" aria-hidden="true" />
            Media
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-600" aria-hidden="true" />
            Alta
          </span>
        </div>

        <div className="text-slate-600 dark:text-slate-300">
          {selectedCell ? (
            <span>
              <strong className="text-slate-900 dark:text-slate-100">{selectedCell.rowLabel}</strong>
              {' · '}
              <span className="font-mono">{selectedCell.bucketLabel}</span>
              {': '}
              <span className="font-mono font-semibold tabular-nums">{selectedCell.count} alertas</span>
              {selectedCell.latestDetail ? ` · Última: ${selectedCell.latestDetail}` : ''}
            </span>
          ) : (
            <span>Haz clic en cualquier celda del mapa para inspeccionar el detalle del sensor o vector.</span>
          )}
        </div>
      </div>
    </section>
  );
}
