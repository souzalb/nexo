'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ModeToggle } from './mode-toggle';
import { Separator } from './ui/separator';
import { SidebarTrigger } from './ui/sidebar';
import { useSession } from 'next-auth/react';
import { NotificationBell } from './notification-bell';
import { Button } from './ui/button';
import { IconBellRinging } from '@tabler/icons-react';

interface SiteHeaderProps {
  pendingRequestsCount: number;
}

export function SiteHeader({ pendingRequestsCount }: SiteHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
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
          {session?.user.role === 'ADMIN' && (
            <>
              <NotificationBell />
              <Button
                className="relative"
                variant="outline"
                onClick={() => router.push('/requests')}
              >
                <IconBellRinging className="h-4 w-4" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
            </>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
