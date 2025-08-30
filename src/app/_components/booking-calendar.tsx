'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import FullCalendar from '@fullcalendar/react';
import { type EventClickArg, type EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RecurringBookingModal } from './recurring-booking-modal';

const bookingFormSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório'),
  roomId: z.string().min(1, 'Selecione uma sala'),
});
type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingCalendarProps {
  initialEvents: EventInput[];
  rooms: Room[];
}

export default function BookingCalendar({
  initialEvents,
  rooms,
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

  const handleDeleteBooking = async () => {
    if (!selectedEvent) return;
    toast.error(`Tem certeza que deseja cancelar esta reserva?`, {
      description: `"${selectedEvent.event.title}"`,
      action: {
        label: 'Confirmar Cancelamento',
        onClick: async () => {
          try {
            const response = await fetch(
              `/api/bookings/${selectedEvent.event.id}`,
              { method: 'DELETE' },
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Falha ao cancelar reserva');
            }
            toast.success('Reserva cancelada com sucesso!');
            handleCloseDetailsModal();
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: { label: 'Manter Reserva', onClick: () => {} },
    });
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --fc-border-color: hsl(214.3 31.8% 91.4%);
          --fc-daygrid-event-dot-width: 8px;
          --fc-list-event-dot-width: 8px;
        }
        .fc {
          --fc-button-bg-color: transparent;
          --fc-button-text-color: hsl(215 20.2% 65.1%);
          --fc-button-border-color: hsl(214.3 31.8% 91.4%);
          --fc-button-hover-bg-color: hsl(210 40% 98%);
          --fc-button-hover-border-color: hsl(214.3 31.8% 91.4%);
          --fc-button-active-bg-color: hsl(210 40% 96.1%);
          --fc-button-active-border-color: hsl(214.3 31.8% 91.4%);
          --fc-today-bg-color: hsl(210 40% 98%);
          --fc-event-bg-color: hsl(210 40% 96.1%);
          --fc-event-border-color: hsl(210 40% 96.1%);
          --fc-event-text-color: hsl(222.2 47.4% 11.2%);
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .fc .fc-button {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
        }
        .fc .fc-daygrid-day-number {
          font-size: 0.875rem;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background-color: var(--fc-today-bg-color);
        }
        .fc .fc-event {
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
        }
      `}</style>

      <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Calendário de Reservas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Clique numa reserva para ver detalhes ou use o botão para criar
            reservas recorrentes.
          </p>
        </div>
        <Button onClick={() => setIsRecurringModalOpen(true)}>
          Criar Reserva Recorrente
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-0 shadow-sm md:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={initialEvents}
          locale={ptBrLocale}
          editable={false}
          selectable={false} // <-- ALTERADO: Desabilita a seleção de horários
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          allDaySlot={false}
          height="auto"
          eventClick={handleEventClick} // <-- Mantido para ver detalhes
          longPressDelay={1}
          eventLongPressDelay={1}
          selectLongPressDelay={1}
        />
      </div>

      <RecurringBookingModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        rooms={rooms}
      />

      {/* --- Modal de Edição de Reserva --- */}
      {isFormModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">Editar Reserva</h2>
            <form
              onSubmit={handleSubmit(handleEditFormSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
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
                  className="block text-sm font-medium text-gray-700"
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
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">Detalhes da Reserva</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Título:</strong> {selectedEvent.event.title}
              </p>
              <p>
                <strong>Início:</strong>{' '}
                {selectedEvent.event.start?.toLocaleString()}
              </p>
              <p>
                <strong>Fim:</strong>{' '}
                {selectedEvent.event.end?.toLocaleString()}
              </p>
              <p>
                <strong>Reservado por:</strong>{' '}
                {selectedEvent.event.extendedProps.userName}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-4">
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
