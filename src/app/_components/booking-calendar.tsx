// src/components/BookingCalendar.tsx
'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// O tipo de evento que nossa API retorna
type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  // ... e outras propriedades que você possa ter
};

interface BookingCalendarProps {
  initialEvents: CalendarEvent[];
}

export default function BookingCalendar({
  initialEvents,
}: BookingCalendarProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek" // Visão inicial de semana
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={initialEvents} // Passamos os eventos iniciais aqui
        locale={ptBrLocale} // Traduz o calendário para Português
        editable={false} // Por enquanto, não permitimos arrastar/redimensionar
        selectable={true} // Permite selecionar horários (para criar reservas no futuro)
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        allDaySlot={false} // Remove a linha "o dia todo"
        height="auto" // Ajusta a altura ao container
      />
    </div>
  );
}
