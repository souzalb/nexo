import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '../_lib/prisma';
import { ReportsManager } from '../_components/reports-manager';
import { AppSidebar } from '../_components/app-sidebar';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { SiteHeader } from '../_components/site-header';
import { authOptions } from '../_lib/auth';

// Busca os dados para os filtros no servidor
async function getFilterData() {
  const usersPromise = db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const roomsPromise = db.room.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const [users, rooms] = await Promise.all([usersPromise, roomsPromise]);
  return { users, rooms };
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const { users, rooms } = await getFilterData();

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
              Gerenciamento de Relatórios
            </h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-200">
              Filtre e exporte os dados de agendamento do sistema.
            </p>
          </div>

          <ReportsManager allUsers={users} allRooms={rooms} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
