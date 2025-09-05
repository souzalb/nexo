import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import { db } from '../_lib/prisma';
import { subDays } from 'date-fns';
import { Period } from '@prisma/client';
// --- Tipos para os dados dos gráficos ---
type BookingsByRoomData = {
  name: string;
  total: number;
};
type BookingsByPeriodData = {
  period: Period | null;
  _count: { period: number };
};

// --- Função de busca de dados no servidor ---
async function getDashboardStats() {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  const totalBookingsPromise = db.booking.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const sixtyDaysBookingsPromise = db.booking.count({
    where: { createdAt: { gte: sixtyDaysAgo } },
  });

  const mostUsedRoomPromise = db.booking.groupBy({
    by: ['roomId'],
    _count: { roomId: true },
    orderBy: { _count: { roomId: 'desc' } },
    take: 1,
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const bookingsByPeriodPromise = db.booking.groupBy({
    by: ['period'],
    _count: { period: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const bookingsByRoomPromise = db.booking.groupBy({
    by: ['roomId'],
    _count: { roomId: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const totalUsersPromise = db.user.count();

  const totalRoomsPromise = db.room.count();

  // Executa todas as buscas em paralelo para melhor performance
  const [
    totalBookings,
    mostUsedRoomQuery,
    bookingsByPeriod,
    bookingsByRoomQuery,
    totalUsers,
    totalRooms,
    sixtyDaysBookings,
  ] = await Promise.all([
    totalBookingsPromise,
    mostUsedRoomPromise,
    bookingsByPeriodPromise,
    bookingsByRoomPromise,
    totalUsersPromise,
    totalRoomsPromise,
    sixtyDaysBookingsPromise,
  ]);

  // Processa os resultados
  let mostUsedRoom = 'N/A';
  if (mostUsedRoomQuery.length > 0) {
    const room = await db.room.findUnique({
      where: { id: mostUsedRoomQuery[0].roomId },
    });
    mostUsedRoom = room?.name || 'Desconhecida';
  }

  const bookingsByRoom: BookingsByRoomData[] = await Promise.all(
    bookingsByRoomQuery.map(async (item) => {
      const room = await db.room.findUnique({ where: { id: item.roomId } });
      return { name: room?.name || 'Desconhecida', total: item._count.roomId };
    }),
  );

  return {
    totalBookings,
    mostUsedRoom,
    bookingsByPeriod: bookingsByPeriod.filter(
      (p) => p.period,
    ) as BookingsByPeriodData[], // Filtra períodos nulos
    bookingsByRoom,
    totalUsers,
    totalRooms,
    sixtyDaysBookings,
  };
}

export async function SectionCards() {
  const stats = await getDashboardStats();
  // stats.sixtyDaysBookings = 50;
  const percentBookings =
    ((stats.totalBookings - stats.sixtyDaysBookings) /
      stats.sixtyDaysBookings) *
    100;
  const positiveGrowth = percentBookings >= 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Reservas (Últimos 30 dias)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalBookings}
          </CardTitle>
          <CardAction>
            {/* Mostra um badge verde se as reservas aumentaram, vermelho se diminuíram */}
            {positiveGrowth ? (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-green-300/30 to-green-400/60"
              >
                <IconTrendingUp />
                {percentBookings.toFixed(1)}%
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-red-300/30 to-red-400/60"
              >
                <IconTrendingDown />
                {percentBookings.toFixed(1)}%
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {positiveGrowth ? 'Em crescimento' : 'Em declínio'}{' '}
            {positiveGrowth ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Total de reservas no último mês
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total de Salas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalRooms}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Aumento constante de desempenho{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Atende às projeções de crescimento
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total de Salas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalRooms}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Aumento constante de desempenho{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Atende às projeções de crescimento
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sala Mais Requisitada</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.mostUsedRoom}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="bg-gradient-to-b from-red-300/30 to-red-400/60"
            >
              <IconTrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Menos 20% neste período <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Sala com mais reservas nos últimos 30 dias
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
