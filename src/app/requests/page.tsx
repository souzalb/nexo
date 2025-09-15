import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '../_lib/prisma';
import { AppSidebar } from '../_components/app-sidebar';
import { BookingRequestsManager } from '../_components/booking-request-manager';
import { SiteHeader } from '../_components/site-header';
import { SidebarProvider, SidebarInset } from '../_components/ui/sidebar';
import CountRequestsPending from '../_actions/count-requests-pending';

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
  if (session?.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

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
        <SiteHeader pendingRequestsCount={CountRequestsPending()} />
        <div className="container mx-auto py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Solicitações de Reserva
            </h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-200">
              Aprove ou recuse os pedidos de agendamento pendentes.
            </p>
          </div>

          <BookingRequestsManager initialRequests={requests} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
