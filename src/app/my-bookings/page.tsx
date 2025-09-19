import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Booking, Room } from '@prisma/client';
import { db } from '../_lib/prisma';
import { MyBookingsManager } from '../_components/my-bookings-manager';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { SidebarProvider, SidebarInset } from '../_components/ui/sidebar';
import { authOptions } from '../_lib/auth';

// Define um tipo mais completo para os nossos dados
export type BookingWithRoom = Booking & {
  room: Pick<Room, 'name' | 'id'>;
};

// Busca as reservas apenas para o utilizador logado
async function getMyBookings(userId: string): Promise<BookingWithRoom[]> {
  return db.booking.findMany({
    where: {
      userId: userId,
    },
    include: {
      room: {
        select: { name: true, id: true }, // Inclui o nome da sala para exibição
      },
    },
    orderBy: {
      startTime: 'desc', // Ordena das mais recentes para as mais antigas
    },
  });
}

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const bookings = await getMyBookings(session.user.id);

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
        <div className="p-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-xl dark:text-gray-100">
              Minhas Reservas
            </h1>
            <p className="mb-6 text-sm text-gray-600 md:text-xs dark:text-gray-200">
              Visualize aqui todos os seus agendamentos, futuros e passados.
            </p>
          </div>

          <MyBookingsManager initialBookings={bookings} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
