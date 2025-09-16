import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Period } from '@prisma/client';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

const requestSchema = z.object({
  roomId: z.string().min(1, 'A sala é obrigatória.'),
  classCode: z.string().min(1, 'O código da turma é obrigatório.'),
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
  startDate: z.string().min(1, 'A data de início é obrigatória.'),
  endDate: z.string().min(1, 'A data de término é obrigatória.'),
  weekdays: z.array(z.number()),
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
    const data = requestSchema.parse(body);

    const targetUserId =
      session.user.role === 'ADMIN' && data.userId
        ? data.userId
        : session.user.id;

    const bookingsToRequest: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const bookingGroupId = crypto.randomUUID();

    const currentDate = new Date(data.startDate);
    const finalDate = new Date(data.endDate);

    while (currentDate <= finalDate) {
      if (data.weekdays.includes(currentDate.getUTCDay())) {
        for (const slot of data.timeSlots) {
          const times = periodTimesUTC[slot];
          const startTime = new Date(currentDate);
          startTime.setUTCHours(times.start[0], times.start[1], 0, 0);

          const endTime = new Date(currentDate);
          endTime.setUTCHours(times.end[0], times.end[1], 0, 0);

          if (endTime < startTime) {
            endTime.setUTCDate(endTime.getUTCDate() + 1);
          }

          bookingsToRequest.push({
            startTime,
            endTime,
            bookingGroupId,
            period: times.period,
          });
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    console.log(data.startDate);

    const newRequest = await db.bookingRequest.create({
      data: {
        roomId: data.roomId,
        classCode: data.classCode,
        timeSlots: data.timeSlots,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        weekdays: data.weekdays,
        userId: targetUserId,
      },
    });

    const admins = await db.user.findMany({ where: { role: 'ADMIN' } });

    await db.notification.createMany({
      data: admins.map((admin) => ({
        message: `Nova solicitação de reserva de ${session.user.name} para a turma "${data.classCode}".`,
        link: '/requests', // Link direto para a página de solicitações
        userId: admin.id,
      })),
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos.', errors: error.message },
        { status: 400 },
      );
    }
    console.error('Erro ao criar solicitação de reserva:', error);
    return NextResponse.json(
      { message: 'Erro interno ao criar a solicitação.' },
      { status: 500 },
    );
  }
}
