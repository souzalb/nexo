import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { AuditLogManager } from '../_components/audit-log-manager';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';
import { db } from '../_lib/prisma';
import { User } from '@prisma/client';

async function getUsers(): Promise<Pick<User, 'id' | 'name'>[]> {
  return db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await getUsers();

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
              Logs de Auditoria
            </h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-200">
              Registo de todas as ações importantes realizadas no sistema.
            </p>
          </div>

          <AuditLogManager allUsers={users} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
