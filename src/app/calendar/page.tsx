import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { Period, Room, User } from '@prisma/client';
import { db } from '../_lib/prisma';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import BookingCalendar from '../_components/booking-calendar';

// Função para mapear o período a um conjunto de cores
const getPeriodColors = (period: Period | null) => {
  if (!period) {
    return { backgroundColor: '#6b7280', borderColor: '#6b7280' }; // Cor Padrão (Cinza)
  }
  switch (period) {
    case 'MANHA':
      return { backgroundColor: '#3b82f6', borderColor: '#2563eb' }; // Azul
    case 'TARDE':
      return { backgroundColor: '#f59e0b', borderColor: '#d97706' }; // Ambar
    case 'NOITE':
      return { backgroundColor: '#ef4444', borderColor: '#dc2626' }; // Vermelho
    default:
      return { backgroundColor: '#6b7280', borderColor: '#4b5563' }; // Cinza
  }
};

// Função de busca atualizada para aceitar e aplicar filtros
async function getBookings(filters: {
  roomId?: string;
  period?: Period;
  userId?: string;
}) {
  const whereClause: {
    roomId?: string;
    period?: Period;
    userId?: string;
  } = {};

  if (filters.roomId) whereClause.roomId = filters.roomId;
  if (filters.period) whereClause.period = filters.period;
  if (filters.userId) whereClause.userId = filters.userId;

  const bookings = await db.booking.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.title} (${booking.room.name})`,
    start: booking.startTime,
    end: booking.endTime,
    ...getPeriodColors(booking.period),
    extendedProps: {
      userName: booking.user.name,
      roomName: booking.room.name,
      roomId: booking.roomId,
      userId: booking.userId,
    },
  }));
}

async function getRooms(): Promise<Room[]> {
  const rooms = await db.room.findMany({ orderBy: { name: 'asc' } });
  return rooms;
}

async function getUsers(): Promise<Pick<User, 'id' | 'name'>[]> {
  return db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

// A página agora aceita `searchParams` para ler os filtros da URL
export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: {
    roomId?: string;
    period?: string;
    userId?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const filters = {
    roomId: searchParams?.roomId,
    period: searchParams?.period as Period | undefined,
    userId: searchParams?.userId,
  };
  const pendingRequestsCountPromise = db.bookingRequest.count({
    where: { status: 'PENDENTE' },
  });

  const [initialEvents, rooms, users, pendingRequestsCount] = await Promise.all(
    [getBookings(filters), getRooms(), getUsers(), pendingRequestsCountPromise],
  );

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
        <SiteHeader pendingRequestsCount={pendingRequestsCount} />
        <div className="container mx-auto py-6 md:py-6">
          <BookingCalendar
            initialEvents={initialEvents}
            rooms={rooms}
            users={users}
            pendingRequestsCount={pendingRequestsCount}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
