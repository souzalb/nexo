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
  name: string;
  occupancy: number;
}

interface RoomOccupancyChartProps {
  data: ChartData[];
}

const chartConfig = {
  occupancy: {
    label: 'Ocupação (%)',
    color: '#8b5cf6', // Roxo suave
  },
} satisfies ChartConfig;

export function RoomOccupancyChart({ data }: RoomOccupancyChartProps) {
  // Pega os 5 com maior ocupação para o gráfico de barras horizontais
  const top5Data = data.sort((a, b) => b.occupancy - a.occupancy).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupação das Salas</CardTitle>
        <CardDescription>
          Percentual estimado nos últimos 30 dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={top5Data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} vertical={false} />
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tickFormatter={(value) =>
                value.length > 20 ? `${value.slice(0, 17)}...` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="occupancy"
              fill="var(--color-occupancy)"
              radius={5}
              barSize={32}
            >
              <LabelList
                position="right"
                offset={8}
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
          Salas com maior lotação <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Baseado no total de blocos disponíveis
        </div>
      </CardFooter>
    </Card>
  );
}
