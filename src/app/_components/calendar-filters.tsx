'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Room, User, Period } from '@prisma/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { IconFilterX } from '@tabler/icons-react';

interface CalendarFiltersProps {
  rooms: Pick<Room, 'id' | 'name'>[];
  users: Pick<User, 'id' | 'name'>[];
}

export function CalendarFilters({ rooms, users }: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (
    key: 'roomId' | 'period' | 'userId',
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

  return (
    <div className="mb-4 flex flex-col items-stretch gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center">
      <span className="hidden text-sm font-semibold text-gray-700 sm:block dark:text-gray-100">
        Filtros:
      </span>
      <div className="grid flex-grow grid-cols-1 gap-4 sm:grid-cols-3">
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
          </SelectContent>
        </Select>

        {/* Filtro por Utilizador */}
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
      </div>

      <Button
        variant="secondary"
        onClick={clearFilters}
        className="mt-2 text-red-500 hover:bg-red-50 hover:text-red-600 sm:mt-0"
      >
        <IconFilterX />
      </Button>
    </div>
  );
}
