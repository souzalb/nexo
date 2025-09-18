'use client';

import { usePathname } from 'next/navigation';
import { ModeToggle } from './mode-toggle';
import { Separator } from './ui/separator';
import { SidebarTrigger } from './ui/sidebar';
import { NotificationBell } from './notification-bell';

export function SiteHeader() {
  const pathname = usePathname();

  const headerNames: { [key: string]: string } = {
    '/': 'Dashboard',
    '/calendar': 'Calendário',
    '/rooms': 'Salas',
    '/resources': 'Recursos',
    '/users': 'Usuários',
    '/profile': 'Perfil',
    '/reports': 'Relatórios',
    '/logs': 'Logs',
    '/my-bookings': 'Minhas Reservas',
    '/rooms-client': 'Salas',
    '/requests': 'Solicitações',
    '/my-requests': 'Minhas Solicitações',
  };
  const nameHeader = headerNames[pathname];
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium capitalize">{nameHeader}</h1>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
