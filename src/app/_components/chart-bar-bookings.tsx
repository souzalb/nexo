'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  Tooltip,
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

// Este é um componente de cliente porque Recharts usa hooks.
// Os dados serão passados como props a partir da página do dashboard (Servidor).
interface ChartData {
  name: string;
  total: number;
}

interface BookingsByRoomChartProps {
  data: ChartData[];
}

// Configuração do gráfico para os nossos dados de "Reservas"
const chartConfig = {
  total: {
    label: 'Reservas',
    color: '#3b82f6', // Azul
  },
} satisfies ChartConfig;

export function BookingsByRoomChart({ data }: BookingsByRoomChartProps) {
  const top5Data = data.sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas Por Sala</CardTitle>
        <CardDescription>
          Total de reservas por sala nos últimos 30 dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart accessibilityLayer data={top5Data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // Oculta o nome da sala se for muito longo, para evitar sobreposição
              // Numa versão futura, poderíamos rodar o texto
              tickFormatter={(value) =>
                value.length > 15 ? `${value.slice(0, 12)}...` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Crescimento de 5.2% esse mês <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Salas mais populares no último mês.
        </div>
      </CardFooter>
    </Card>
  );
}
