'use client';

import {
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from '@tabler/icons-react';
import Link from 'next/link'; // 1. Importar o Link do Next.js

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { signOut, useSession } from 'next-auth/react';

export function NavUser() {
  const { isMobile } = useSidebar();
  const { data } = useSession();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={data?.user.image ?? ''}
                  alt={data?.user.name ?? ''}
                />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{data?.user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {data?.user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={data?.user.image ?? ''}
                    alt={data?.user.name ?? ''}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {data?.user.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {data?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* 2. Envolver o DropdownMenuItem com o componente Link */}
              <Link href="/profile" passHref>
                <DropdownMenuItem className="cursor-pointer">
                  <IconUserCircle />
                  Minha Conta
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer">
                <IconNotification />
                Notificações
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer hover:bg-red-600/10 hover:text-red-500"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <IconLogout />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
