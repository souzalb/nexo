import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { Period } from '@prisma/client';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

// Schema para validar os dados de uma reserva recorrente
const recurringBookingSchema = z.object({
  roomId: z.string(),
  classCode: z.string().min(1, 'O código da turma é obrigatório'),
  period: z.enum(['MANHA', 'TARDE', 'NOITE']),
  startDate: z.string(), // Espera "YYYY-MM-DD"
  endDate: z.string(), // Espera "YYYY-MM-DD"
  weekdays: z.array(z.number().min(0).max(6)),
  userId: z.string().optional(),
});

// Mapeia os períodos para horários específicos, JÁ AJUSTADOS PARA UTC-3
const periodTimesUTC: {
  [key: string]: { start: [number, number]; end: [number, number] };
} = {
  MANHA: { start: [10, 30], end: [14, 30] }, // 07:30-11:30 no Brasil
  TARDE: { start: [16, 0], end: [20, 0] }, // 13:00-17:00 no Brasil
  NOITE: { start: [21, 30], end: [0, 30] }, // 18:30-21:30 no Brasil (termina no dia seguinte em UTC)
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { roomId, classCode, period, startDate, endDate, weekdays, userId } =
      recurringBookingSchema.parse(body);

    const targetUserId =
      session.user.role === 'ADMIN' && userId ? userId : session.user.id;

    const bookingsToCreate: {
      title: string;
      startTime: Date;
      endTime: Date;
      userId: string;
      roomId: string;
      classCode: string;
      bookingGroupId: string;
      period: Period;
    }[] = [];

    const user = await db.user.findUnique({
      where: { id: targetUserId },
    });

    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);
    const bookingGroupId = crypto.randomUUID();
    const title = `${classCode} - ${user?.name || 'Usuário Desconhecido'}`;
    const times = periodTimesUTC[period];

    while (currentDate <= finalDate) {
      if (weekdays.includes(currentDate.getUTCDay())) {
        const startTime = new Date(currentDate);
        startTime.setUTCHours(times.start[0], times.start[1], 0, 0);

        const endTime = new Date(currentDate);
        endTime.setUTCHours(times.end[0], times.end[1], 0, 0);

        if (endTime < startTime) {
          endTime.setUTCDate(endTime.getUTCDate() + 1);
        }

        bookingsToCreate.push({
          title,
          startTime,
          endTime,
          userId: targetUserId,
          roomId,
          classCode,
          bookingGroupId,
          period,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (bookingsToCreate.length === 0) {
      return NextResponse.json(
        {
          message:
            'Nenhuma data válida encontrada para os dias da semana selecionados.',
        },
        { status: 400 },
      );
    }

    const userPeriodConflict = await db.booking.findFirst({
      where: {
        userId: targetUserId,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
      include: {
        room: { select: { name: true } },
      },
    });

    if (userPeriodConflict) {
      const conflictDate = userPeriodConflict.startTime.toLocaleDateString(
        'pt-BR',
        { timeZone: 'UTC' },
      );
      return NextResponse.json(
        {
          message: `Este utilizador já possui uma reserva ("${userPeriodConflict.title}") na sala "${userPeriodConflict.room.name}" que conflita com este período no dia ${conflictDate}.`,
        },
        { status: 409 },
      );
    }

    const roomConflict = await db.booking.findFirst({
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

    if (roomConflict) {
      const conflictDate = roomConflict.startTime.toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      });
      return NextResponse.json(
        {
          message: `Conflito de horário encontrado. A sala já está reservada no dia ${conflictDate}.`,
        },
        { status: 409 },
      );
    }

    await db.booking.createMany({
      data: bookingsToCreate,
    });

    return NextResponse.json(
      { message: `${bookingsToCreate.length} reservas criadas com sucesso.` },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    console.error('Erro ao criar reservas:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
