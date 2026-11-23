import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ThreatTrendPoint } from '../lib/types';

interface ThreatTrendChartProps {
  data: ThreatTrendPoint[];
}

export function ThreatTrendChart({ data }: ThreatTrendChartProps) {
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <section
      aria-label="Tendencia temporal de nivel de amenaza IA"
      data-testid="soc-threat-trend-chart"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <TrendingUp
            className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Tendencia Temporal de Amenaza (Motor Edge AI)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evolución del índice de amenaza (0–100) y confianza del clasificador k-NN en tiempo real.
            </p>
          </div>
        </div>

        {latest && (
          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              Último índice:{' '}
              <strong
                className={
                  latest.threatScore >= 60
                    ? 'text-red-600 dark:text-red-400'
                    : latest.threatScore >= 30
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {latest.threatScore}/100
              </strong>
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-600 dark:text-slate-300">{latest.predictedLabel}</span>
          </div>
        )}
      </div>

      <div className="mt-4 h-64 w-full">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Acumulando muestras del motor de IA para graficar la tendencia temporal...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.22} />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                width={38}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value: unknown, name: unknown) => {
                  const n = String(name);
                  if (n === 'Índice de amenaza') return [`${value} / 100`, n];
                  if (n === 'Confianza k-NN') return [`${value}%`, n];
                  return [String(value), n];
                }}
                labelFormatter={(label, payload) => {
                  const pt = payload?.[0]?.payload as ThreatTrendPoint | undefined;
                  return pt ? `${label} · ${pt.predictedLabel} (Z=${pt.zScore}σ)` : String(label);
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
              <ReferenceLine
                y={50}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.65}
                label={{
                  value: 'Umbral Alerta (50)',
                  position: 'insideTopRight',
                  fill: '#ef4444',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="threatScore"
                name="Índice de amenaza"
                stroke="#dc2626"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                name="Confianza k-NN"
                stroke="#2563eb"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
