import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { Period } from '@prisma/client';
import { db } from '@/app/_lib/prisma';

// Mapa de horários (igual ao da criação de reservas)
const periodTimesUTC: {
  [key: string]: {
    start: [number, number];
    end: [number, number];
    period: Period;
  };
} = {
  MANHA_PRIMEIRO: { start: [10, 30], end: [12, 30], period: 'MANHA' },
  MANHA_SEGUNDO: { start: [12, 30], end: [14, 30], period: 'MANHA' },
  MANHA_INTEIRO: { start: [10, 30], end: [14, 30], period: 'MANHA' },
  TARDE_PRIMEIRO: { start: [16, 0], end: [18, 0], period: 'TARDE' },
  TARDE_SEGUNDO: { start: [18, 0], end: [20, 0], period: 'TARDE' },
  TARDE_INTEIRO: { start: [16, 0], end: [20, 0], period: 'TARDE' },
  NOITE_PRIMEIRO: { start: [21, 30], end: [23, 0], period: 'NOITE' },
  NOITE_SEGUNDO: { start: [23, 0], end: [1, 30], period: 'NOITE' },
  NOITE_INTEIRO: { start: [21, 30], end: [1, 30], period: 'NOITE' },
};

// PATCH /api/booking-requests/[id]  (Aprovar ou Recusar)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { status } = await req.json(); // Espera { "status": "APROVADO" } ou { "status": "RECUSADO" }
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
      return NextResponse.json(
        { message: 'Status inválido.' },
        { status: 400 },
      );
    }

    const request = await db.bookingRequest.findUnique({
      where: { id: params.id },
    });
    if (!request || request.status !== 'PENDENTE') {
      return NextResponse.json(
        { message: 'Solicitação não encontrada ou já processada.' },
        { status: 404 },
      );
    }

    if (status === 'RECUSADO') {
      await db.bookingRequest.update({
        where: { id: params.id },
        data: { status: 'RECUSADO' },
      });
      return NextResponse.json({
        message: 'Solicitação recusada com sucesso.',
      });
    }

    // --- LÓGICA DE APROVAÇÃO COMPLETA ---
    const bookingsToCreate: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const bookingGroupId = crypto.randomUUID();
    const title = `Turma: ${request.classCode}`;

    const currentDate = new Date(request.startDate);
    while (currentDate <= request.endDate) {
      if (request.weekdays.includes(currentDate.getUTCDay())) {
        for (const slot of request.timeSlots) {
          const times = periodTimesUTC[slot];
          if (!times) continue; // Ignora slots inválidos

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
            userId: request.userId,
            roomId: request.roomId,
            classCode: request.classCode,
            bookingGroupId,
            period: times.period,
          });
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (bookingsToCreate.length === 0) {
      // Se por algum motivo não gerar reservas, recusa a solicitação para evitar um estado inconsistente
      await db.bookingRequest.update({
        where: { id: params.id },
        data: { status: 'RECUSADO' },
      });
      return NextResponse.json(
        {
          message:
            'Nenhum horário válido gerado para esta solicitação. A solicitação foi recusada.',
        },
        { status: 400 },
      );
    }

    // Verificação de conflito de utilizador
    const userConflict = await db.booking.findFirst({
      where: {
        userId: request.userId,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
    });
    if (userConflict) {
      return NextResponse.json(
        {
          message: `Conflito: O utilizador já tem uma reserva num dos horários solicitados.`,
        },
        { status: 409 },
      );
    }

    // Verificação de conflito de sala
    const roomConflict = await db.booking.findFirst({
      where: {
        roomId: request.roomId,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
    });
    if (roomConflict) {
      return NextResponse.json(
        {
          message: `Conflito: A sala já está ocupada num dos horários solicitados.`,
        },
        { status: 409 },
      );
    }

    // Se passar nas verificações, cria as reservas e atualiza a solicitação numa transação
    await db.$transaction([
      db.booking.createMany({ data: bookingsToCreate }),
      db.bookingRequest.update({
        where: { id: params.id },
        data: { status: 'APROVADO' },
      }),
    ]);

    return NextResponse.json({
      message: `${bookingsToCreate.length} reservas criadas e solicitação aprovada com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
