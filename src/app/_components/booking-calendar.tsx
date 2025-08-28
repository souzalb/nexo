// src/components/BookingCalendar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room } from '@prisma/client';
import { useSession } from 'next-auth/react';

import FullCalendar from '@fullcalendar/react';
import { type DateSelectArg, type EventClickArg } from '@fullcalendar/core';
import { type EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// Schema e tipo para o formulário
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

  // Estados para controlar os modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Estados para guardar os dados selecionados
  const [selectedSlot, setSelectedSlot] = useState<DateSelectArg | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  // Efeito para preencher o formulário quando um evento é selecionado para edição
  useEffect(() => {
    if (!selectedEvent || !isFormModalOpen) return;

    setValue('title', selectedEvent.event.title);
    const roomId = selectedEvent.event.extendedProps.roomId;
    if (roomId) {
      setValue('roomId', roomId);
    }
  }, [selectedEvent, isFormModalOpen, setValue]);

  // --- Handlers para o fluxo de Criação ---
  const handleOpenCreateModal = (selectInfo: DateSelectArg) => {
    setSelectedSlot(selectInfo);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedSlot(null);
    setSelectedEvent(null);
    reset();
  };

  // Handler unificado para submeter o formulário (Criação e Edição)
  const handleFormSubmit = async (data: BookingFormData) => {
    const isEditing = !!selectedEvent;

    const url = isEditing
      ? `/api/bookings/${selectedEvent.event.id}`
      : '/api/bookings';
    const method = isEditing ? 'PATCH' : 'POST';

    const payload = isEditing
      ? data
      : {
          ...data,
          startTime: selectedSlot?.startStr,
          endTime: selectedSlot?.endStr,
        };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha na operação');
      }

      handleCloseFormModal();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  // --- Handlers para o fluxo de Detalhes/Edição/Exclusão ---
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

    if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
      try {
        const response = await fetch(
          `/api/bookings/${selectedEvent.event.id}`,
          {
            method: 'DELETE',
          },
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Falha ao cancelar reserva');
        }
        handleCloseDetailsModal();
        router.refresh();
      } catch (error) {
        alert(error);
      }
    }
  };

  return (
    <>
      <div className="rounded-lg bg-white p-4 shadow-md">
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
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          allDaySlot={false}
          height="auto"
          select={handleOpenCreateModal}
          eventClick={handleEventClick}
        />
      </div>

      {/* Modal de Formulário (Criar/Editar) */}
      {isFormModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">
              {selectedEvent ? 'Editar Reserva' : 'Criar Nova Reserva'}
            </h2>
            {selectedSlot && (
              <p className="mb-4 text-sm text-gray-600">
                Horário: {new Date(selectedSlot.start).toLocaleString()} até{' '}
                {new Date(selectedSlot.end).toLocaleString()}
              </p>
            )}
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Título da Reserva
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
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
                <select
                  id="roomId"
                  {...register('roomId')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">Selecione uma sala</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Capacidade: {room.capacity})
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.roomId.message}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCloseFormModal}
                  className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
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
              <button
                type="button"
                onClick={handleCloseDetailsModal}
                className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Fechar
              </button>

              {(session?.user.role === 'ADMIN' ||
                session?.user.id ===
                  selectedEvent.event.extendedProps.userId) && (
                <>
                  <button
                    onClick={handleStartEditing}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleDeleteBooking}
                    className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Cancelar Reserva
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
