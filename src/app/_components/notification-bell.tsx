'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { IconBell } from '@tabler/icons-react';

type Notification = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) return;
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      } catch (error) {
        console.error('Falha ao buscar notificações', error);
      }
    };
    fetchNotifications();
  }, []);

  // Função chamada ao clicar num item da lista de notificações.
  const handleItemClick = async (notification: Notification) => {
    // 1. Se a notificação ainda não foi lida, marca-a como lida.
    if (!notification.read) {
      try {
        // Chama a API para marcar apenas esta notificação como lida
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
        });

        // Atualiza o estado local para refletir a mudança imediatamente
        setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
      } catch (error) {
        console.log(error);
        toast.error('Falha ao marcar a notificação como lida.');
      }
    }

    // 2. Navega para o link associado, se existir.
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <IconBell />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleItemClick(notification)}
                className={`cursor-pointer whitespace-normal ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}
              >
                <div className="flex items-start gap-2 py-1">
                  {!notification.read && (
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                  <p
                    className={`text-sm ${!notification.read ? 'font-semibold' : 'text-muted-foreground'}`}
                  >
                    {notification.message}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground p-4 text-center text-sm">
            Nenhuma notificação.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
