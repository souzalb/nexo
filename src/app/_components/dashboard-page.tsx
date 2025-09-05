import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { subDays } from 'date-fns';

import {
  IconBuildingSkyscraper,
  IconCalendar,
  IconUsersGroup,
} from '@tabler/icons-react';

import { Period } from '@prisma/client';
import { db } from '../_lib/prisma';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BookingsByRoomChart } from './bookings-by-room-chart';
import { BookingsByPeriodChart } from './booking-by-periodo-chart';

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

  const totalBookingsPromise = db.booking.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
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

  // Executa todas as buscas em paralelo para melhor performance
  const [
    totalBookings,
    mostUsedRoomQuery,
    bookingsByPeriod,
    bookingsByRoomQuery,
  ] = await Promise.all([
    totalBookingsPromise,
    mostUsedRoomPromise,
    bookingsByPeriodPromise,
    bookingsByRoomPromise,
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
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Apenas admins podem ver esta página. Outros utilizadores são redirecionados para o calendário.
  if (session?.user.role !== 'ADMIN') {
    redirect('/calendar');
  }

  const stats = await getDashboardStats();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">
        Dashboard de Análises
      </h1>

      {/* Secção de Cartões (Widgets) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reservas (Últimos 30 dias)
            </CardTitle>
            <IconCalendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-muted-foreground text-xs">
              Total de agendamentos no último mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sala Mais Requisitada
            </CardTitle>
            <IconBuildingSkyscraper className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostUsedRoom}</div>
            <p className="text-muted-foreground text-xs">
              Sala com mais reservas nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
        {/* Você pode adicionar mais cartões aqui, como total de utilizadores ou salas */}
      </div>

      {/* Secção de Gráficos */}
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Reservas por Sala</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <BookingsByRoomChart data={stats.bookingsByRoom} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribuição por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingsByPeriodChart data={stats.bookingsByPeriod} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
