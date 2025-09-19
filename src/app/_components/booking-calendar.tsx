'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room, User } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import FullCalendar from '@fullcalendar/react';
import { type EventClickArg, type EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { RecurringBookingModal } from './recurring-booking-modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { IconBellRinging, IconCalendarPlus } from '@tabler/icons-react';
import { CalendarFilters } from './calendar-filters';

const bookingFormSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório'),
  roomId: z.string().min(1, 'Selecione uma sala'),
});
type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingCalendarProps {
  initialEvents: EventInput[];
  rooms: Room[];
  users: Pick<User, 'id' | 'name'>[];
  pendingRequestsCount: number;
}

export default function BookingCalendar({
  initialEvents,
  rooms,
  users,
  pendingRequestsCount,
}: BookingCalendarProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  // Preenche o formulário quando o modal de edição é aberto
  useEffect(() => {
    if (selectedEvent && isFormModalOpen) {
      setValue('title', selectedEvent.event.title);
      const roomId = selectedEvent.event.extendedProps.roomId;
      if (roomId) {
        setValue('roomId', roomId);
      }
    }
  }, [selectedEvent, isFormModalOpen, setValue]);

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedEvent(null);
    reset();
  };

  // Handler de submissão APENAS para edição
  const handleEditFormSubmit = async (data: BookingFormData) => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/bookings/${selectedEvent.event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(responseData.message || 'Falha na atualização');

      toast.success(`Reserva atualizada com sucesso!`);
      handleCloseFormModal();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
    setIsDetailsModalOpen(true);
  };

  const handleStartEditing = () => {
    if (!selectedEvent) return;
    setIsDetailsModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteBooking = () => {
    if (!selectedEvent) return;

    const eventId = selectedEvent.event.id;
    const groupId = selectedEvent.event.extendedProps.bookingGroupId;
    const startDate = selectedEvent.event.start;

    const closeDetailsModal = () => setIsDetailsModalOpen(false);

    // Se a reserva não pertencer a um grupo, mostra apenas a confirmação simples
    if (!groupId) {
      toast.error('Tem a certeza que deseja cancelar esta reserva?', {
        action: {
          label: 'Confirmar',
          onClick: () => handleSingleDelete(eventId, closeDetailsModal),
        },
        cancel: { label: 'Manter Reserva', onClick: () => {} },
      });
      return;
    }

    const handleSingleDelete = async (
      bookingId: string,
      callback?: () => void,
    ) => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falha ao cancelar a reserva.');
        }
        toast.success('Reserva cancelada com sucesso!');
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        if (callback) callback();
      }
    };

    const handleRecurringDelete = async (
      groupId: string,
      startDate: Date | null,
      callback?: () => void,
    ) => {
      if (!startDate) return;
      try {
        const startDateIso = startDate.toISOString();
        const response = await fetch(
          `/api/bookings/group/${groupId}?startDate=${startDateIso}`,
          { method: 'DELETE' },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || 'Falha ao cancelar as reservas.');

        toast.success(data.message);
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        if (callback) callback();
      }
    };

    // Se pertencer a um grupo, mostra as duas opções
    toast.error(`Cancelar a reserva "${selectedEvent.event.title}"`, {
      description:
        'Esta reserva faz parte de um agendamento recorrente. Como deseja cancelá-la?',
      duration: 10000,
      action: {
        label: 'Apenas Esta',
        onClick: () => handleSingleDelete(eventId, closeDetailsModal),
      },
      cancel: {
        label: 'Esta e as Futuras',
        onClick: () =>
          handleRecurringDelete(groupId, startDate, closeDetailsModal),
      },
    });
  };

  return (
    <>
      <style jsx global>{`
        /* --- Light Mode (Padrão) --- */
        :root {
          --fc-border-color: hsl(214.3 31.8% 91.4%); /* slate-200 */
          --fc-daygrid-event-dot-width: 8px;
          --fc-list-event-dot-width: 8px;
          --fc-page-bg-color: hsl(0 0% 100%); /* white */
          --fc-list-bg-color: hsl(210 40% 98%); /* slate-50 */
          --fc-theme-standard-body-bg-color: hsl(0 0% 100%); /* white */
        }

        /* --- Dark Mode --- */
        .dark {
          --fc-border-color: hsl(217.2 32.6% 17.5%); /* slate-800 */
          --fc-page-bg-color: hsl(222.2 84% 4.9%); /* slate-950 */
          --fc-list-bg-color: hsl(222.2 47.4% 11.2%); /* slate-900 */
          --fc-theme-standard-body-bg-color: hsl(
            222.2 47.4% 11.2%
          ); /* slate-900 */
        }

        /* --- Estilos do Calendário (para ambos os temas) --- */
        .fc {
          /* Botões */
          --fc-button-bg-color: transparent;
          --fc-button-text-color: hsl(215 20.2% 65.1%); /* slate-500 */
          --fc-button-border-color: hsl(214.3 31.8% 91.4%); /* slate-200 */
          --fc-button-hover-bg-color: hsl(210 40% 98%); /* slate-50 */
          --fc-button-active-bg-color: hsl(210 40% 96.1%); /* slate-100 */

          /* Dia de Hoje */
          --fc-today-bg-color: hsl(210 40% 98%); /* slate-50 */

          /* Eventos */
          --fc-event-bg-color: hsl(210 40% 96.1%); /* slate-100 */
          --fc-event-border-color: hsl(210 40% 96.1%); /* slate-100 */
          --fc-event-text-color: hsl(222.2 47.4% 11.2%); /* slate-900 */
        }

        .dark .fc {
          /* Botões Dark */
          --fc-button-text-color: hsl(210 40% 96.1%); /* slate-200 */
          --fc-button-border-color: hsl(217.2 32.6% 17.5%); /* slate-800 */
          --fc-button-hover-bg-color: hsl(
            217.2 32.6% 22.5%
          ); /* slate-700/800 */
          --fc-button-active-bg-color: hsl(217.2 32.6% 27.5%); /* slate-700 */

          /* Dia de Hoje Dark */
          --fc-today-bg-color: hsl(217.2 32.6% 17.5%); /* slate-800 */

          /* Eventos Dark */
          --fc-event-bg-color: hsl(222.2 47.4% 11.2%); /* slate-900 */
          --fc-event-border-color: hsl(217.2 32.6% 17.5%); /* slate-800 */
          --fc-event-text-color: hsl(210 40% 98%); /* slate-50 */
        }

        /* --- Estilos estruturais --- */
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Responsividade do título do calendário */
        @media (max-width: 769px) {
          .fc .fc-toolbar-title {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .fc .fc-toolbar-title {
            font-size: 0.875rem;
          }
        }

        .dark .fc .fc-toolbar-title {
          color: hsl(210 40% 98%); /* slate-50 */
        }

        .fc .fc-button {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        }

        /* Responsividade dos botões do calendário */
        @media (max-width: 768px) {
          .fc .fc-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .fc .fc-button {
            padding: 0.25rem 0.5rem;
            font-size: 0.7rem;
          }
        }

        .fc .fc-daygrid-day-number {
          font-size: 0.875rem;
        }

        @media (max-width: 480px) {
          .fc .fc-daygrid-day-number {
            font-size: 0.75rem;
          }
        }

        .fc .fc-daygrid-day.fc-day-today {
          background-color: var(--fc-today-bg-color);
        }

        .fc .fc-event {
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
        }

        @media (max-width: 480px) {
          .fc .fc-event {
            padding: 0.125rem 0.25rem;
            font-size: 0.75rem;
          }
        }

        /* Melhorias na toolbar do calendário para mobile */
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }

          .fc .fc-toolbar-chunk {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        /* Ocultar view semanal em telas muito pequenas */
        @media (max-width: 480px) {
          .fc .fc-timeGridWeek-button {
            display: none;
          }
        }
      `}</style>

      <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 md:text-xl dark:text-gray-100">
            Gerenciamento de Reservas
          </h1>
          <p className="mt-1 text-sm text-gray-500 md:text-xs dark:text-gray-200">
            Clique numa reserva para ver detalhes ou use o botão para criar
            reservas.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-col lg:flex-row">
          {session?.user.role === 'ADMIN' && (
            <>
              <Button
                className="relative"
                variant="outline"
                onClick={() => router.push('/requests')}
              >
                <IconBellRinging className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ver Solicitações</span>
                <span className="sm:hidden">Solicitações</span>
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
            </>
          )}
          <Button onClick={() => setIsRecurringModalOpen(true)}>
            <IconCalendarPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">
              {session?.user.role === 'ADMIN'
                ? 'Criar Reserva'
                : 'Solicitar Reserva'}
            </span>
            <span className="sm:hidden">
              {session?.user.role === 'ADMIN' ? 'Criar' : 'Solicitar'}
            </span>
          </Button>
        </div>
      </div>
      <CalendarFilters rooms={rooms} users={users} />
      <div className="rounded-lg border p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={initialEvents}
          locale={ptBrLocale}
          timeZone="local"
          editable={false}
          selectable={false}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          allDaySlot={false}
          height="auto"
          eventClick={handleEventClick}
          longPressDelay={1}
          eventLongPressDelay={1}
          selectLongPressDelay={1}
        />
      </div>

      <RecurringBookingModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        rooms={rooms}
        users={users}
      />

      {/* --- Modal de Edição de Reserva --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-secondary w-full max-w-lg rounded-lg p-8">
            <h2 className="mb-4 text-xl font-bold">Editar Reserva</h2>
            <form
              onSubmit={handleSubmit(handleEditFormSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-100"
                >
                  Título da Reserva
                </label>
                <Input id="title" {...register('title')} />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="roomId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-100"
                >
                  Sala
                </label>
                <Controller
                  name="roomId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sala" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} (Capacidade: {room.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.roomId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.roomId.message}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseFormModal}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'A salvar...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal de Detalhes da Reserva --- */}
      {isDetailsModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-secondary w-[90%] max-w-lg rounded-lg p-8 md:w-full">
            <h2 className="mb-4 text-xl font-bold">Detalhes da Reserva</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Título:</strong> {selectedEvent.event.title}
              </p>
              <p>
                <strong>Início:</strong>{' '}
                {selectedEvent.event.start?.toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              <p>
                <strong>Fim:</strong>{' '}
                {selectedEvent.event.end?.toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              <p>
                <strong>Reservado para:</strong>{' '}
                {selectedEvent.event.extendedProps.userName}
              </p>
            </div>
            <div className="mt-6 flex justify-between gap-4 md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDetailsModal}
              >
                Fechar
              </Button>
              {(session?.user.role === 'ADMIN' ||
                session?.user.id ===
                  selectedEvent.event.extendedProps.userId) && (
                <>
                  <Button onClick={handleStartEditing}>Editar</Button>
                  <Button variant="destructive" onClick={handleDeleteBooking}>
                    Cancelar Reserva
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
