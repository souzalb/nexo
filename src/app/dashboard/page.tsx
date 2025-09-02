import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { Period, Room, User } from '@prisma/client';
import { db } from '../_lib/prisma';
import BookingCalendar from '../_components/booking-calendar';
import { AppSidebar } from '../_components/app-sidebar';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { SiteHeader } from '../_components/site-header';

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

// Função para buscar e formatar os dados no servidor
async function getBookings() {
  const bookings = await db.booking.findMany({
    include: {
      user: { select: { name: true } },
      room: { select: { name: true } },
    },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.title} (${booking.room.name})`,
    start: booking.startTime,
    end: booking.endTime,
    ...getPeriodColors(booking.period), // Atribui as cores aqui
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
  const users = await db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return users;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const initialEvents = await getBookings();
  const rooms = await getRooms();
  const users = await getUsers();

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
        <div className="container mx-auto p-4 md:p-8">
          <BookingCalendar
            initialEvents={initialEvents}
            rooms={rooms}
            users={users}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
