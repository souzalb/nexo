'use client';

import * as React from 'react';

import { useIsMobile } from '@/hooks/use-mobile'; // <-- Hook reintroduzido
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

// Configuração do gráfico para os nossos dados de "Reservas"
const chartConfig = {
  reservas: {
    label: 'Reservas',
    color: '#3b82f6',
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile(); // <-- Utiliza o hook
  const [timeRange, setTimeRange] = React.useState('30d');
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // --- LÓGICA DE ADAPTAÇÃO MÓVEL REINTRODUZIDA ---
  React.useEffect(() => {
    // Define o período padrão para 7 dias em dispositivos móveis
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const rangeInDays = timeRange.replace('d', '');
        const response = await fetch(
          `/api/dashboard/bookings-over-time?range=${rangeInDays}`,
        );
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error('Falha ao buscar dados do gráfico', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Novas Reservas ao Longo do Tempo</CardTitle>
        <CardDescription>
          Exibindo o número de reservas criadas por dia no período selecionado.
        </CardDescription>
        <CardAction>
          {/* --- CONTROLOS RESPONSIVOS REINTRODUZIDOS --- */}
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden @[540px]/card:flex" // Visível em ecrãs maiores
          >
            <ToggleGroupItem value="90d">Últimos 90 dias</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 dias</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 dias</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 @[540px]/card:hidden" size="sm">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillReservas" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-reservas)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-reservas)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('pt-BR', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(`${value}T00:00:00`).toLocaleDateString(
                        'pt-BR',
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'UTC',
                        },
                      )
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="reservas"
                type="natural"
                fill="url(#fillReservas)"
                stroke="var(--color-reservas)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
