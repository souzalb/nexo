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
import {
  differenceInMinutes,
  endOfToday,
  startOfToday,
  subDays,
} from 'date-fns';

// --- Função de busca de dados no servidor ---
async function getCardStats() {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60); // Para comparação de crescimento
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const yesterdayStart = subDays(todayStart, 1);
  const yesterdayEnd = subDays(todayEnd, 1);
  const OPERATING_HOURS_PER_DAY = 12;

  // Prepara todas as buscas em paralelo
  const bookingsLast30DaysPromise = db.booking.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  const bookingsPrev30DaysPromise = db.booking.count({
    where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
  });
  const todayBookingsPromise = db.booking.findMany({
    where: { startTime: { gte: todayStart, lte: todayEnd } },
    select: { startTime: true, endTime: true },
  });
  const yesterdayBookingsPromise = db.booking.findMany({
    where: { startTime: { gte: yesterdayStart, lte: yesterdayEnd } },
    select: { startTime: true, endTime: true },
  });

  const mostUsedRoomPromise = db.booking.groupBy({
    by: ['roomId'],
    _count: { roomId: true },
    orderBy: { _count: { roomId: 'desc' } },
    take: 1,
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const totalUsersPromise = db.user.count();
  const totalRoomsPromise = db.room.count();

  const [
    bookingsLast30Days,
    bookingsPrev30Days,
    todayBookings,
    yesterdayBookings,
    totalUsers,
    totalRooms,
    mostUsedRoomQuery,
  ] = await Promise.all([
    bookingsLast30DaysPromise,
    bookingsPrev30DaysPromise,
    todayBookingsPromise,
    yesterdayBookingsPromise,
    totalUsersPromise,
    totalRoomsPromise,
    mostUsedRoomPromise,
  ]);

  // Calcula a percentagem de crescimento das reservas
  const percentBookings =
    bookingsPrev30Days > 0
      ? ((bookingsLast30Days - bookingsPrev30Days) / bookingsPrev30Days) * 100
      : 100;

  //Busca a sala mais usada
  let mostUsedRoom = 'N/A';
  if (mostUsedRoomQuery.length > 0) {
    const room = await db.room.findUnique({
      where: { id: mostUsedRoomQuery[0].roomId },
    });
    mostUsedRoom = room?.name || 'Desconhecida';
  }

  // Calcula a taxa de ocupação
  const totalBookedMinutes = todayBookings.reduce((acc, booking) => {
    return acc + differenceInMinutes(booking.endTime, booking.startTime);
  }, 0);

  const totalBookedMinutesYesterday = yesterdayBookings.reduce(
    (acc, booking) => {
      return acc + differenceInMinutes(booking.endTime, booking.startTime);
    },
    0,
  );

  const totalAvailableHours = totalRooms * OPERATING_HOURS_PER_DAY;
  const occupancyRate =
    totalAvailableHours > 0
      ? (totalBookedMinutes / 60 / totalAvailableHours) * 100
      : 0;

  const occupancyRateYesterday =
    totalAvailableHours > 0
      ? (totalBookedMinutesYesterday / 60 / totalAvailableHours) * 100
      : 0;

  return {
    numberOfBookings: bookingsLast30Days,
    percentChange: percentBookings,
    totalUsers,
    totalRooms,
    occupancyRate,
    occupancyRateYesterday,
    mostUsedRoom,
  };
}

export async function SectionCards() {
  const stats = await getCardStats();

  const positiveGrowth = stats.percentChange >= 0;
  const yesterdayGrowth = stats.occupancyRate - stats.occupancyRateYesterday;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Reservas (Últimos 30 dias)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.numberOfBookings}
          </CardTitle>
          <CardAction>
            {/* Mostra um badge verde se as reservas aumentaram, vermelho se diminuíram */}
            {positiveGrowth ? (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-green-300/30 to-green-400/60"
              >
                <IconTrendingUp />
                {stats.percentChange.toFixed(1)}%
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-red-300/30 to-red-400/60"
              >
                <IconTrendingDown />
                {stats.percentChange.toFixed(1)}%
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
          <CardDescription>Taxa de Ocupação Hoje</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.occupancyRate.toFixed(1)}%
          </CardTitle>
          <CardAction>
            {yesterdayGrowth >= 0 ? (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-red-300/30 to-red-400/60"
              >
                <IconTrendingUp />
                {yesterdayGrowth.toFixed(1)}%
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-gradient-to-b from-green-300/30 to-green-400/60"
              >
                <IconTrendingDown />
                {Math.abs(yesterdayGrowth).toFixed(1)}%
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {yesterdayGrowth >= 0
              ? 'Aumento de ocupação'
              : 'Redução de ocupação'}{' '}
            {yesterdayGrowth >= 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            Tempo disponível que foi reservado.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total de Salas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalRooms}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Acompanhamento da quantidade de salas{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total de salas disponíveis para reserva.
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sala Mais Requisitada</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.mostUsedRoom}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ambiente com maior ocupação <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Sala com mais reservas nos últimos 30 dias
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
