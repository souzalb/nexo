'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  IconCalendarCancel,
  IconFilter,
  IconFilterX,
} from '@tabler/icons-react';
import { BookingWithRoom } from '../my-bookings/page';
import { RoomDetailsModal } from './rooms-details-modal';

// Define a estrutura dos dados do formulário de filtro
type FiltersFormData = {
  startDate?: string;
  endDate?: string;
  roomId?: string;
  classCode?: string;
};

interface MyBookingsManagerProps {
  initialBookings: BookingWithRoom[];
}

export function MyBookingsManager({ initialBookings }: MyBookingsManagerProps) {
  const router = useRouter();
  const [activeFilters, setActiveFilters] = useState<FiltersFormData>({});

  // --- NOVO ESTADO PARA CONTROLAR O MODAL DE DETALHES ---
  const [detailsRoomId, setDetailsRoomId] = useState<string | null>(null);

  const { register, handleSubmit, control, reset } = useForm<FiltersFormData>();

  // Deriva a lista de salas únicas para o seletor de filtro
  const uniqueRooms = useMemo(() => {
    const roomMap = new Map<string, { id: string; name: string | null }>();
    initialBookings.forEach((booking) => {
      if (!roomMap.has(booking.room.id)) {
        roomMap.set(booking.room.id, booking.room);
      }
    });
    return Array.from(roomMap.values()).sort(
      (a, b) => a.name?.localeCompare(b.name || '') || 0,
    );
  }, [initialBookings]);

  // Filtra as reservas com base nos filtros ativos
  const filteredBookings = useMemo(() => {
    return initialBookings.filter((booking) => {
      const { startDate, endDate, roomId, classCode } = activeFilters;
      // Adiciona um dia à data final para garantir que o dia inteiro seja incluído na comparação
      const inclusiveEndDate = endDate
        ? new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))
        : null;

      if (startDate && new Date(startDate) > new Date(booking.startTime))
        return false;
      if (inclusiveEndDate && inclusiveEndDate < new Date(booking.startTime))
        return false;
      if (roomId && roomId !== 'all' && booking.roomId !== roomId) return false;
      if (
        classCode &&
        !booking.classCode?.toLowerCase().includes(classCode.toLowerCase())
      )
        return false;

      return true;
    });
  }, [initialBookings, activeFilters]);

  // Separa as reservas filtradas em futuras e passadas
  const { futureBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    return filteredBookings.reduce(
      (acc, booking) => {
        if (new Date(booking.endTime) >= now) {
          acc.futureBookings.push(booking);
        } else {
          acc.pastBookings.push(booking);
        }
        return acc;
      },
      {
        futureBookings: [] as BookingWithRoom[],
        pastBookings: [] as BookingWithRoom[],
      },
    );
  }, [filteredBookings]);

  const handleCancelBooking = async (bookingId: string) => {
    toast.error('Tem a certeza que deseja cancelar esta reserva?', {
      action: {
        label: 'Confirmar Cancelamento',
        onClick: async () => {
          try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.message || 'Falha ao cancelar a reserva.',
              );
            }
            toast.success('Reserva cancelada com sucesso!');
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: { label: 'Manter Reserva', onClick: () => {} },
    });
  };

  const onFilterSubmit = (data: FiltersFormData) => {
    setActiveFilters(data);
    toast.info('Filtros aplicados.');
  };

  const clearFilters = () => {
    setActiveFilters({});
    reset({ startDate: '', endDate: '', roomId: 'all', classCode: '' });
    toast.info('Filtros limpos.');
  };

  return (
    <div className="space-y-8">
      {/* Secção de Filtros */}
      <Card>
        <CardContent className="flex items-center gap-4 p-0 px-4">
          <h3 className="hidden w-fit text-sm font-semibold text-gray-700 sm:block dark:text-gray-100">
            Filtros:
          </h3>
          <form
            onSubmit={handleSubmit(onFilterSubmit)}
            className="flex w-full items-center gap-4"
          >
            <Controller
              name="roomId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Sala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Salas</SelectItem>
                    {uniqueRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              placeholder="Filtrar por Cód. Turma"
              {...register('classCode')}
            />
            <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
              Data de início:
            </h3>
            <Input type="date" {...register('startDate')} />
            <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
              Data de término:
            </h3>
            <Input type="date" {...register('endDate')} />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <IconFilter className="mr-2 h-4 w-4" />
                Aplicar
              </Button>
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="mt-2 text-red-500 hover:bg-red-50 hover:text-red-600 sm:mt-0"
              >
                <IconFilterX />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Secção de Próximas Reservas */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Reservas</CardTitle>
          <CardDescription>
            Estes são os seus agendamentos futuros. Pode cancelá-los se
            necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {futureBookings.length > 0 ? (
              futureBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {booking.title}
                      <button
                        onClick={() => setDetailsRoomId(booking.roomId)}
                        className="ml-2 cursor-pointer text-sm font-normal text-gray-600 hover:underline"
                      >
                        ({booking.room.name})
                      </button>
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.startTime).toLocaleString('pt-BR')} -{' '}
                      {new Date(booking.endTime).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    <IconCalendarCancel className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </li>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500">
                Nenhuma reserva futura encontrada.
              </p>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Secção de Histórico de Reservas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Reservas</CardTitle>
          <CardDescription>
            Estes são os seus agendamentos passados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {pastBookings.length > 0 ? (
              pastBookings.map((booking) => (
                <li key={booking.id} className="py-4">
                  <p className="font-semibold text-gray-800">
                    {booking.title}
                    <button
                      onClick={() => setDetailsRoomId(booking.roomId)}
                      className="ml-2 text-sm font-normal text-blue-600 hover:underline"
                    >
                      ({booking.room.name})
                    </button>
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(booking.startTime).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500">
                Nenhum histórico de reservas encontrado.
              </p>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* --- RENDERIZA O NOVO MODAL --- */}
      <RoomDetailsModal
        roomId={detailsRoomId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDetailsRoomId(null);
        }}
      />
    </div>
  );
}
