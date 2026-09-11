'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Room, User, Period } from '@prisma/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { IconFilterX } from '@tabler/icons-react';

interface CalendarFiltersProps {
  rooms: Room[];
  users: Pick<User, 'id' | 'name'>[];
}

export function CalendarFilters({ rooms, users }: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const handleFilterChange = (
    key: 'roomId' | 'period' | 'userId' | 'location',
    value: string,
  ) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    // Se o valor for "all", removemos o filtro. Caso contrário, definimo-lo.
    if (value === 'all') {
      current.delete(key);
    } else {
      current.set(key, value);
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';

    router.push(`/calendar${query}`);
  };

  const clearFilters = () => {
    router.push('/calendar');
  };

  const locations = Array.from(
    new Set(rooms.map((r) => r.location).filter(Boolean)),
  ) as string[];

  return (
    <div className="mb-4 flex flex-col items-stretch gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center">
      <span className="hidden text-sm font-semibold text-gray-700 sm:block dark:text-gray-100">
        Filtros:
      </span>
      <div className="grid flex-grow grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Filtro por Sala */}
        <Select
          value={searchParams.get('roomId') || 'all'}
          onValueChange={(value) => handleFilterChange('roomId', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas as Salas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Salas</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Bloco (Localização) */}
        <Select
          value={searchParams.get('location') || 'all'}
          onValueChange={(value) => handleFilterChange('location', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos os Blocos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Blocos</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Período */}
        <Select
          value={searchParams.get('period') || 'all'}
          onValueChange={(value) => handleFilterChange('period', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos os Períodos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Períodos</SelectItem>
            <SelectItem value={Period.MANHA}>Manhã</SelectItem>
            <SelectItem value={Period.TARDE}>Tarde</SelectItem>
            <SelectItem value={Period.NOITE}>Noite</SelectItem>
            <SelectItem value="INTEGRAL">Integral</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Utilizador */}
        {session?.user.role !== 'TEACHER' && (
          <Select
            value={searchParams.get('userId') || 'all'}
            onValueChange={(value) => handleFilterChange('userId', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos os Usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Usuários</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-4 sm:mt-0 sm:justify-start">
        {session?.user.id && (
          <div className="flex items-center space-x-2">
            <Switch
              id="my-bookings-switch"
              checked={searchParams.get('userId') === session.user.id}
              onCheckedChange={(checked) =>
                handleFilterChange('userId', checked ? session.user.id : 'all')
              }
            />
            <label
              htmlFor="my-bookings-switch"
              className="cursor-pointer text-sm font-medium whitespace-nowrap text-gray-700 select-none dark:text-gray-100"
            >
              Minhas Reservas
            </label>
          </div>
        )}
        <Button
          variant="secondary"
          onClick={clearFilters}
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <IconFilterX />
        </Button>
      </div>
    </div>
  );
}
