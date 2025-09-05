'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Period } from '@prisma/client';

interface ChartData {
  period: Period | null;
  _count: { period: number };
}

interface BookingsByPeriodChartProps {
  data: ChartData[];
}

const COLORS = {
  MANHA: '#3b82f6', // Azul
  TARDE: '#f59e0b', // Amarelo
  NOITE: '#ef4444', // Vermelho
};

export function BookingsByPeriodChart({ data }: BookingsByPeriodChartProps) {
  const chartData = data.map((item) => ({
    name: item.period
      ? item.period.charAt(0) + item.period.slice(1).toLowerCase()
      : 'Desconhecido',
    value: item._count.period,
    fill: COLORS[item.period || 'MANHA'],
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Tooltip
          cursor={{ fill: 'hsl(210 40% 98%)' }}
          contentStyle={{
            backgroundColor: 'hsl(0 0% 100%)',
            borderRadius: '0.5rem',
            border: '1px solid hsl(214.3 31.8% 91.4%)',
          }}
        />
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={120}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
