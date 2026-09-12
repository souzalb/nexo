'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import { TrendingUp } from 'lucide-react';

interface ChartData {
  period: string;
  occupancy: number;
}

interface PeriodOccupancyChartProps {
  data: ChartData[];
}

const chartConfig = {
  occupancy: {
    label: 'Ocupação (%)',
  },
  manha: {
    label: 'Manhã',
    color: '#3b82f6', // Azul
  },
  tarde: {
    label: 'Tarde',
    color: '#f59e0b', // Laranja
  },
  noite: {
    label: 'Noite',
    color: '#ef4444', // Vermelho
  },
} satisfies ChartConfig;

export function PeriodOccupancyChart({ data }: PeriodOccupancyChartProps) {
  // Transforma os dados para o gráfico
  const chartData = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.period.toLowerCase()})`,
    label:
      item.period.charAt(0).toUpperCase() + item.period.slice(1).toLowerCase(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupação por Período</CardTitle>
        <CardDescription>Taxa de lotação nos últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis hide domain={[0, 100]} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="occupancy" radius={8} barSize={40}>
              <LabelList
                position="top"
                offset={10}
                className="fill-foreground font-semibold"
                fontSize={12}
                formatter={(val: number) => `${val}%`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="mt-4 flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Períodos mais concorridos <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Ocupação sobre a capacidade máxima do período
        </div>
      </CardFooter>
    </Card>
  );
}
