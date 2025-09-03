import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '../_lib/prisma';
import { ResourcesManager } from '../_components/resources-manager';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';

// Busca os recursos no servidor
async function getResources() {
  return db.resource.findMany({
    orderBy: { name: 'asc' },
  });
}

export default async function ResourcesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const resources = await getResources();

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
          <h1 className="mb-6 text-3xl font-bold text-gray-800">
            Gestão de Recursos
          </h1>
          <p className="mb-6 text-gray-600">
            Adicione, edite ou remova os recursos disponíveis nas salas (ex:
            Projetor, Ar Condicionado).
          </p>

          {/* Componente de cliente para interatividade */}
          <ResourcesManager initialResources={resources} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
