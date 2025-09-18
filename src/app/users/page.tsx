import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '../_lib/prisma';
import { columns, UsersTable } from '../_components/users-table';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { authOptions } from '../_lib/auth';

// Função de Servidor para buscar os usuários
async function getUsers() {
  const users = await db.user.findMany({
    // Selecionamos apenas os campos que queremos exibir, NUNCA a senha!
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
  return users;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  // Proteção de rota no nível da página
  if (session?.user.role !== 'ADMIN') {
    redirect('/');
  }

  const usersData = await getUsers();

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
          <UsersTable columns={columns} data={usersData} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
