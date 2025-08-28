// src/components/BookingCalendar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room } from '@prisma/client';

import FullCalendar from '@fullcalendar/react';
import { type DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// Tipos para os dados do formulário e eventos
type CalendarEvent = { id: string; title: string; start: Date; end: Date };
const bookingFormSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório'),
  roomId: z.string().min(1, 'Selecione uma sala'),
});
type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingCalendarProps {
  initialEvents: CalendarEvent[];
  rooms: Room[];
}

export default function BookingCalendar({
  initialEvents,
  rooms,
}: BookingCalendarProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DateSelectArg | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  // Handler para quando o usuário seleciona um horário no calendário
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedSlot(selectInfo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    reset();
  };

  // Handler para submeter o formulário de nova reserva
  const handleFormSubmit = async (data: BookingFormData) => {
    if (!selectedSlot) return;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          startTime: selectedSlot.startStr,
          endTime: selectedSlot.endStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar reserva');
      }

      handleCloseModal();
      router.refresh(); // Atualiza os eventos na página
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <FullCalendar
          // ... (plugins, initialView, headerToolbar, etc. como antes) ...
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
          select={handleDateSelect} // <--- AQUI ESTÁ A MÁGICA
        />
      </div>

      {/* Modal de Criação de Reserva */}
      {isModalOpen && selectedSlot && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">Criar Nova Reserva</h2>
            <p className="mb-4 text-sm text-gray-600">
              Horário selecionado:{' '}
              {new Date(selectedSlot.start).toLocaleString()} até{' '}
              {new Date(selectedSlot.end).toLocaleString()}
            </p>
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
                  onClick={handleCloseModal}
                  className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
