'use client';

import * as React from 'react';
import {
  IconCalendarEvent,
  IconCalendarStats,
  IconCamera,
  IconDashboard,
  IconDatabase,
  IconDeviceProjector,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconLogs,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import { NavMain } from './nav-main';
import { NavDocuments } from './nav-documents';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import Link from 'next/link';
import Image from 'next/image';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: IconDashboard,
    },
    {
      title: 'Calendário',
      url: '/calendar',
      icon: IconCalendarEvent,
    },
    {
      title: 'Salas',
      url: '/rooms',
      icon: IconCalendarStats,
    },
    {
      title: 'Recursos',
      url: '/resources',
      icon: IconDeviceProjector,
    },
    {
      title: 'Usuários',
      url: '/users',
      icon: IconUsers,
    },
    {
      title: 'Minhas Reservas',
      url: '/my-bookings',
      icon: IconCalendarEvent,
    },
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: IconCamera,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Proposal',
      icon: IconFileDescription,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Prompts',
      icon: IconFileAi,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Get Help',
      url: '#',
      icon: IconHelp,
    },
    {
      title: 'Search',
      url: '#',
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: 'Relatórios',
      url: '/reports',
      icon: IconReport,
    },
    {
      name: 'Logs do Sistema',
      url: '/logs',
      icon: IconLogs,
    },
    {
      name: 'Data Library',
      url: '#',
      icon: IconDatabase,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-[40px] data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image
                  src="/nexo_header.png"
                  fill
                  alt="logo nexo"
                  className="object-cover dark:grayscale dark:invert"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
