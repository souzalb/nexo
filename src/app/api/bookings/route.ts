import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { Period } from '@prisma/client';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

const recurringBookingSchema = z.object({
  roomId: z.string(),
  classCode: z.string().min(1, 'O código da turma é obrigatório'),
  timeSlots: z
    .array(
      z.enum([
        'MANHA_PRIMEIRO',
        'MANHA_SEGUNDO',
        'MANHA_INTEIRO',
        'TARDE_PRIMEIRO',
        'TARDE_SEGUNDO',
        'TARDE_INTEIRO',
        'NOITE_PRIMEIRO',
        'NOITE_SEGUNDO',
        'NOITE_INTEIRO',
      ]),
    )
    .min(1, 'Selecione pelo menos um horário.'),
  startDate: z.string(),
  endDate: z.string(),
  weekdays: z.array(z.number().min(0).max(6)),
  userId: z.string().optional(),
});

const periodTimesUTC: {
  [key: string]: {
    start: [number, number];
    end: [number, number];
    period: Period;
  };
} = {
  MANHA_PRIMEIRO: { start: [10, 30], end: [12, 30], period: 'MANHA' }, // 07:30 - 09:30 BRT
  MANHA_SEGUNDO: { start: [12, 30], end: [14, 30], period: 'MANHA' }, // 09:30 - 11:30 BRT
  MANHA_INTEIRO: { start: [10, 30], end: [14, 30], period: 'MANHA' }, // 07:30 - 11:30 BRT

  TARDE_PRIMEIRO: { start: [16, 0], end: [18, 0], period: 'TARDE' }, // 13:00 - 15:00 BRT
  TARDE_SEGUNDO: { start: [18, 0], end: [20, 0], period: 'TARDE' }, // 15:00 - 17:00 BRT
  TARDE_INTEIRO: { start: [16, 0], end: [20, 0], period: 'TARDE' }, // 13:00 - 17:00 BRT

  NOITE_PRIMEIRO: { start: [21, 30], end: [23, 0], period: 'NOITE' }, // 18:30 - 20:00 BRT
  NOITE_SEGUNDO: { start: [23, 0], end: [1, 30], period: 'NOITE' }, // 20:00 - 21:30 BRT
  NOITE_INTEIRO: { start: [21, 30], end: [1, 30], period: 'NOITE' }, // 18:30 - 21:30 BRT
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      roomId,
      classCode,
      timeSlots,
      startDate,
      endDate,
      weekdays,
      userId,
    } = recurringBookingSchema.parse(body);

    const targetUserId =
      session.user.role === 'ADMIN' && userId ? userId : session.user.id;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingsToCreate: any[] = [];
    const bookingGroupId = crypto.randomUUID();
    const user = await db.user.findUnique({
      where: { id: targetUserId },
    });

    const title = `${classCode} - ${user?.name || 'Sem Nome'}`;
    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      if (weekdays.includes(currentDate.getUTCDay())) {
        for (const slot of timeSlots) {
          const times = periodTimesUTC[slot];
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
            period: times.period,
          });
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (bookingsToCreate.length === 0) {
      return NextResponse.json(
        { message: 'Nenhuma data válida encontrada.' },
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

    const room = await db.room.findUnique({ where: { id: roomId } });

    await db.auditLog.create({
      data: {
        action: 'CREATE_BOOKING',
        details: `${bookingsToCreate.length} ${bookingsToCreate.length > 1 ? 'reservas foram criadas para a turma' : 'reserva foi criada para a turma'} "${classCode}" na sala "${room?.name}".`,
        userId: session.user.id,
      },
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
