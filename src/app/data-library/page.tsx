import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AppSidebar } from '../_components/app-sidebar';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { SiteHeader } from '../_components/site-header';
import { authOptions } from '../_lib/auth';
import { DataLibraryManager } from '../_components/data-library-manager';

export default async function DataLibraryPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    redirect('/');
  }

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
        <div className="flex flex-col gap-6 p-6 pt-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 md:text-2xl dark:text-gray-100">
              Data Library
            </h1>
            <p className="text-xs text-gray-600 md:text-sm dark:text-gray-200">
              Gerencie e limpe os dados do sistema para manter a performance.
            </p>
          </div>

          <DataLibraryManager />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
