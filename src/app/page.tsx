import { getServerSession } from 'next-auth';
import { AppSidebar } from './_components/app-sidebar';

import { SectionCards } from './_components/section-cards';
import { SiteHeader } from './_components/site-header';
import { SidebarInset, SidebarProvider } from './_components/ui/sidebar';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { ChartAreaInteractive } from './_components/chart-area-interactive copy';

import { subDays } from 'date-fns';
import { db } from './_lib/prisma';
import { Period } from '@prisma/client';
import { BookingsByRoomChart } from './_components/chart-bar-bookings';
import { BookingsByPeriodChart } from './_components/chart-booking-by-period';
import { TopUsersChart } from './_components/chart-power-users';
import { BookingsByTypeChart } from './_components/chart-booking-by-room';

// --- Tipos para os dados dos gráficos ---
type BookingsByRoomData = {
  name: string;
  total: number;
};
type BookingsByPeriodData = {
  period: Period | null;
  _count: { period: number };
};

type TopUsersData = { name: string; total: number };
type BookingsByTypeData = { type: string; total: number };

async function getDashboardStats() {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const bookingsWithRoomTypePromise = db.booking.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: { room: { select: { type: true } } },
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

  const topUsersPromise = db.booking.groupBy({
    by: ['userId'],
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 5,
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  // Executa todas as buscas em paralelo para melhor performance
  const [
    bookingsByPeriod,
    bookingsByRoomQuery,
    topUsersQuery,
    bookingsWithRoomTypeQuery,
  ] = await Promise.all([
    bookingsByPeriodPromise,
    bookingsByRoomPromise,
    topUsersPromise,
    bookingsWithRoomTypePromise,
  ]);

  const bookingsByRoom: BookingsByRoomData[] = await Promise.all(
    bookingsByRoomQuery.map(async (item) => {
      const room = await db.room.findUnique({
        where: { id: item.roomId },
      });
      return { name: room?.name || 'Desconhecida', total: item._count.roomId };
    }),
  );

  const bookingsByTypeMap = bookingsWithRoomTypeQuery.reduce(
    (acc, booking) => {
      const type = booking.room.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const bookingsByType: BookingsByTypeData[] = Object.entries(
    bookingsByTypeMap,
  ).map(([type, total]) => ({
    type,
    total,
  }));

  const topUsers: TopUsersData[] = await Promise.all(
    topUsersQuery.map(async (item) => {
      const user = await db.user.findUnique({ where: { id: item.userId } });
      return {
        name: user?.name || 'Utilizador Removido',
        total: item._count.userId,
      };
    }),
  );

  return {
    bookingsByPeriod: bookingsByPeriod.filter(
      (p) => p.period,
    ) as BookingsByPeriodData[], // Filtra períodos nulos
    bookingsByRoom,
    topUsers,
    bookingsByType,
  };
}

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { bookingsByPeriod, bookingsByRoom, topUsers, bookingsByType } =
    await getDashboardStats();

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
                <BookingsByRoomChart data={bookingsByRoom} />
                <BookingsByPeriodChart data={bookingsByPeriod} />
                <TopUsersChart data={topUsers} />
                <BookingsByTypeChart data={bookingsByType} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
