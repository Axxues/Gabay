import React, { useContext, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { ChartSpec } from '@/services/lms/types/chart.types';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { LMSContext } from '@/contexts/LMSContext';

const PALETTE = [
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#14b8a6', // Teal
];

interface InteractiveChartProps {
  spec: ChartSpec;
}

function useIsDarkMode(): boolean {
  const lms = useContext(LMSContext);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (lms?.theme) return lms.theme === 'dark';
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    if (lms?.theme) {
      setIsDark(lms.theme === 'dark');
      return;
    }
    if (typeof document === 'undefined') return;
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [lms?.theme]);

  return isDark;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-elevated backdrop-blur-md">
        <p className="text-[11px] font-semibold text-muted-foreground">{label || item.name}</p>
        <p className="text-xs font-bold text-foreground">
          {item.name ? `${item.name}: ` : ''}
          <span className="text-primary font-extrabold">{Number(item.value).toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ spec }) => {
  const isDark = useIsDarkMode();

  if (!spec || !Array.isArray(spec.data) || spec.data.length === 0) {
    return (
      <div className="my-3 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
        No chart data available to display.
      </div>
    );
  }

  const type = (spec.type || 'bar').toLowerCase();

  const formattedData = spec.data.map((d, index) => ({
    ...d,
    fill: d.color || PALETTE[index % PALETTE.length],
  }));

  const renderIcon = () => {
    switch (type) {
      case 'pie':
        return <PieIcon className="h-4 w-4 text-primary" />;
      case 'line':
        return <LineIcon className="h-4 w-4 text-primary" />;
      default:
        return <BarChart3 className="h-4 w-4 text-primary" />;
    }
  };

  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const axisLineStroke = isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1';

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-subtle transition-all hover:border-border/80">
      {spec.title && (
        <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-muted border border-border p-2">
              {renderIcon()}
            </div>
            <div>
              <h4 className="text-[13.5px] font-bold tracking-tight text-foreground">{spec.title}</h4>
              {spec.description && (
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{spec.description}</p>
              )}
            </div>
          </div>
          <span className="rounded-full bg-muted/80 border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {type} chart
          </span>
        </div>
      )}

      <div className="h-64 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'pie' ? (
            <PieChart>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                  rx: 8,
                  ry: 8,
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs font-medium text-foreground">{value}</span>
                )}
              />
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={36}
                paddingAngle={3}
                animationDuration={600}
              >
                {formattedData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          ) : type === 'line' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: axisLineStroke }}
              />
              <YAxis
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                  strokeWidth: 1.5,
                  strokeDasharray: '3 3',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ec4899"
                strokeWidth={2.5}
                dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10b981' }}
                animationDuration={600}
              />
            </LineChart>
          ) : (
            <BarChart data={formattedData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: axisLineStroke }}
              />
              <YAxis
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                  rx: 6,
                  ry: 6,
                }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                maxBarSize={55}
                animationDuration={600}
              >
                {formattedData.map((entry, idx) => (
                  <Cell key={`bar-${idx}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
