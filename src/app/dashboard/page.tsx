// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '../_lib/prisma';
import BookingCalendar from '../_components/booking-calendar';

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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const initialEvents = await getBookings();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Olá, <span className="text-indigo-600">{session.user?.name}!</span>
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Veja abaixo o calendário de reservas das salas.
        </p>
      </div>

      <BookingCalendar initialEvents={initialEvents} />
    </div>
  );
}
