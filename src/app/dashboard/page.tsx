// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '../_lib/prisma';
import BookingCalendar from '../_components/booking-calendar';
import { Room } from '@prisma/client';

// Função para buscar e formatar os dados no servidor
async function getBookings() {
  const bookings = await db.booking.findMany({
    include: {
      user: { select: { name: true } },
      room: { select: { name: true } },
    },
  });

  // O componente do calendário espera datas, não strings. Prisma retorna Date objects, o que é perfeito.
  return bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.title} (${booking.room.name})`,
    start: booking.startTime,
    end: booking.endTime,
  }));
}

async function getRooms(): Promise<Room[]> {
  const rooms = await db.room.findMany({ orderBy: { name: 'asc' } });
  return rooms;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Buscamos tanto os eventos quanto as salas
  const initialEvents = await getBookings();
  const rooms = await getRooms();

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* ... seu cabeçalho ... */}

      {/* Passamos as salas para o componente do calendário */}
      <BookingCalendar initialEvents={initialEvents} rooms={rooms} />
    </div>
  );
}
