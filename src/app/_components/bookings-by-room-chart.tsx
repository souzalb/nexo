'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface ChartData {
  name: string;
  total: number;
}

interface BookingsByRoomChartProps {
  data: ChartData[];
}

export function BookingsByRoomChart({ data }: BookingsByRoomChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(210 40% 98%)' }}
          contentStyle={{
            backgroundColor: 'hsl(0 0% 100%)',
            borderRadius: '0.5rem',
            border: '1px solid hsl(214.3 31.8% 91.4%)',
          }}
        />
        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
