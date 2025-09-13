import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '../_lib/prisma';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { SidebarProvider, SidebarInset } from '../_components/ui/sidebar';
import { BookingRequestsClient } from '../_components/booking-request-client';

async function getAllRequests() {
  return db.bookingRequest.findMany({
    include: {
      user: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function BookingRequestsPage() {
  const session = await getServerSession(authOptions);

  const requests = await getAllRequests();

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
        <div className="container mx-auto py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Solicitações de Reserva
            </h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-200">
              Aprove ou recuse os pedidos de agendamento pendentes.
            </p>
          </div>

          <BookingRequestsClient initialRequests={requests} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
