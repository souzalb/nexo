// src/app/dashboard/rooms/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '@/app/_lib/prisma';
import RoomsManager from '@/app/_components/rooms-manager';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';

// Função para buscar os dados no servidor
async function getRooms() {
  const rooms = await db.room.findMany({
    orderBy: {
      name: 'asc',
    },
  });
  return rooms;
}

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  // Verificação de segurança: Apenas admins podem ver esta página
  if (session?.user.role !== 'ADMIN') {
    redirect('/');
  }

  const initialRooms = await getRooms();

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
        <RoomsManager initialRooms={initialRooms} />
      </SidebarInset>
    </SidebarProvider>
  );
}
