import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { z } from 'zod';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

const schema = z.object({
  roomId: z.string(),
  classCode: z.string().min(1, 'O código da turma é obrigatório'),
  period: z.enum(['MANHA', 'TARDE', 'NOITE']),
  startDate: z.string(),
  endDate: z.string(),
  weekdays: z.array(z.number().min(0).max(6)),
});

// Mapeia os períodos para horários específicos (UTC)
const periodTimes: {
  [key: string]: { start: [number, number]; end: [number, number] };
} = {
  MANHA: { start: [7, 30], end: [11, 30] },
  TARDE: { start: [13, 0], end: [17, 0] },
  NOITE: { start: [18, 30], end: [22, 30] },
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { roomId, classCode, period, startDate, endDate, weekdays } =
      schema.parse(body);

    const bookingsToCreate: {
      title: string;
      startTime: Date;
      endTime: Date;
      userId: string;
      roomId: string;
      classCode: string;
      bookingGroupId: string;
    }[] = [];

    // --- LÓGICA DE DATA CORRIGIDA PARA SER INCLUSIVA E ROBUSTA A FUSOS HORÁRIOS ---
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    // Força as datas para o meio-dia em UTC para evitar problemas de ambiguidade de fuso horário à meia-noite.
    currentDate.setUTCHours(12, 0, 0, 0);
    finalDate.setUTCHours(12, 0, 0, 0);

    const bookingGroupId = crypto.randomUUID();
    const title = `Turma: ${classCode}`;
    const times = periodTimes[period];

    // O ciclo agora compara os tempos em milissegundos, garantindo que o último dia seja incluído.
    while (currentDate.getTime() <= finalDate.getTime()) {
      // Usamos getUTCDay() para ser consistente com o nosso tratamento de datas em UTC.
      if (weekdays.includes(currentDate.getUTCDay())) {
        const startTimeUTC = new Date(currentDate);
        startTimeUTC.setUTCHours(times.start[0], times.start[1], 0, 0);

        const endTimeUTC = new Date(currentDate);
        endTimeUTC.setUTCHours(times.end[0], times.end[1], 0, 0);

        bookingsToCreate.push({
          title,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          userId: session.user.id,
          roomId,
          classCode,
          bookingGroupId,
        });
      }
      // Incrementa a data em um dia, operando em UTC para evitar problemas.
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (bookingsToCreate.length === 0) {
      return NextResponse.json(
        {
          message:
            'Nenhuma data válida encontrada para os dias da semana selecionados no período.',
        },
        { status: 400 },
      );
    }

    // Verificação de conflito em massa
    const conflictingBookings = await db.booking.findMany({
      where: {
        roomId: roomId,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
    });

    if (conflictingBookings.length > 0) {
      const firstConflict = conflictingBookings[0];
      const conflictDate = firstConflict.startTime.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });
      return NextResponse.json(
        {
          message: `Conflito de horário encontrado. A sala já está reservada no dia ${conflictDate}.`,
        },
        { status: 409 },
      );
    }

    // Criação em massa
    await db.booking.createMany({
      data: bookingsToCreate,
    });

    return NextResponse.json(
      {
        message: `${bookingsToCreate.length} reservas criadas com sucesso para a turma ${classCode}.`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    console.error('Erro ao criar reservas recorrentes:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
