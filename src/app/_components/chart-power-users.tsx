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

// Define o tipo de dados que o gráfico espera receber
interface ChartData {
  name: string;
  total: number;
}

interface TopUsersChartProps {
  data: ChartData[];
}

// Configuração do gráfico para os nossos dados
const chartConfig = {
  total: {
    label: 'Reservas',
    color: '#3b82f6', // Cor primária (azul)
  },
  label: {
    color: '#ffffff', // Cor do texto dentro da barra (branco)
  },
} satisfies ChartConfig;

export function TopUsersChart({ data }: TopUsersChartProps) {
  const top5Data = data.sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Usuários Ativos</CardTitle>
        <CardDescription>
          Usuários com mais reservas nos últimos 30 dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={top5Data}
            layout="vertical"
            margin={{
              right: 50, // Ajuste para alinhar as labels
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
              tickFormatter={(value) =>
                value.length > 15 ? `${value.slice(0, 12)}...` : value
              }
            />
            <XAxis dataKey="total" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="total"
              layout="vertical"
              fill="var(--color-total)"
              radius={4}
            >
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-white"
                fontSize={12}
              />
              <LabelList
                dataKey="total"
                position="right"
                offset={8}
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
          Este gráfico identifica os usuários mais ativos.
        </div>
      </CardFooter>
    </Card>
  );
}
