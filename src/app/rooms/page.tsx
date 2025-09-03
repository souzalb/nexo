import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { Resource } from '@prisma/client';
import { db } from '../_lib/prisma';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import RoomsManager from '../_components/rooms-manager';

// Busca as salas e inclui os recursos associados a cada uma
async function getRooms() {
  return db.room.findMany({
    orderBy: { name: 'asc' },
    include: {
      resources: true, // Inclui a lista de recursos para cada sala
      images: true, // Inclui a lista de imagens para cada sala
    },
  });
}

// Busca todos os recursos disponíveis para preencher o formulário
async function getResources(): Promise<Resource[]> {
  return db.resource.findMany({
    orderBy: { name: 'asc' },
  });
}

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Busca todos os dados necessários no servidor
  const [rooms, allResources] = await Promise.all([getRooms(), getResources()]);

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
        <RoomsManager initialRooms={rooms} allResources={allResources} />
      </SidebarInset>
    </SidebarProvider>
  );
}
