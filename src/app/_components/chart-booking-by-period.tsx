'use client';

import { Pie, PieChart, Cell } from 'recharts';
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
import { Period } from '@prisma/client';
import { TrendingUp } from 'lucide-react';

// Define o tipo de dados esperado pela prop
interface ChartData {
  period: Period | null;
  _count: { period: number };
}

interface BookingsByPeriodChartProps {
  data: ChartData[];
}

// Configuração do gráfico para os dados e cores
const chartConfig = {
  reservas: {
    label: 'Reservas',
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

export function BookingsByPeriodChart({ data }: BookingsByPeriodChartProps) {
  // Transforma os dados recebidos para o formato que o gráfico espera
  const chartData = data.map((item) => ({
    period: item.period ? item.period.toLowerCase() : 'desconhecido',
    label: item.period
      ? item.period.charAt(0) + item.period.slice(1).toLowerCase()
      : 'Desconhecido',
    total: item._count.period,
    fill: `var(--color-${item.period?.toLowerCase()})`,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Reservas Por Período</CardTitle>
        <CardDescription>
          Distribuição de reservas nos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="total"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.label}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Crescimento de 5.2% esse mês <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Períodos mais concorridos no último mês.
        </div>
      </CardFooter>
    </Card>
  );
}
