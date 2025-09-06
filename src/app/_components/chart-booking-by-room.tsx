'use client';

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';
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

// Define o tipo de dados que o gráfico espera receber
interface ChartData {
  type: string;
  total: number;
}

interface BookingsByTypeChartProps {
  data: ChartData[];
}

// Configuração do gráfico para os nossos dados
const chartConfig = {
  total: {
    label: 'Reservas',
    color: '#3b82f6', // Cor primária (azul)
  },
} satisfies ChartConfig;

export function BookingsByTypeChart({ data }: BookingsByTypeChartProps) {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Reservas por Tipo de Sala</CardTitle>
        <CardDescription>
          Popularidade dos tipos de sala nos últimos 30 dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full w-full pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] w-full"
        >
          <RadarChart data={data}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarGrid gridType="circle" radialLines={false} />
            <PolarAngleAxis dataKey="type" />
            <Radar
              dataKey="total"
              fill="var(--color-total)"
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground flex items-center gap-2 leading-none">
          Este gráfico identifica o tipo de espaço que é mais procurado.
        </div>
      </CardFooter>
    </Card>
  );
}
