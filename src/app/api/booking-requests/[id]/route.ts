import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { Period } from '@prisma/client';
import { Resend } from 'resend';
import { UserStatusEmail } from '@/emails/teacher-email';
import { render } from '@react-email/components';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { status, refusalReason } = await req.json();
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
      return NextResponse.json(
        { message: 'Status inválido.' },
        { status: 400 },
      );
    }

    const request = await db.bookingRequest.findUnique({
      where: { id: id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!request || request.status !== 'PENDENTE' || !request.user.email) {
      return NextResponse.json(
        {
          message:
            'Solicitação não encontrada, já processada ou utilizador sem email.',
        },
        { status: 404 },
      );
    }

    let responseMessage = '';
    let notificationMessage = '';

    if (status === 'APROVADO') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bookingsToCreate: any[] = [];
      const bookingGroupId = crypto.randomUUID();
      const title = `Turma: ${request.classCode}`;
      const currentDate = new Date(request.startDate);

      while (currentDate <= request.endDate) {
        if (request.weekdays.includes(currentDate.getUTCDay())) {
          for (const slot of request.timeSlots) {
            const times = periodTimesUTC[slot];
            if (!times) continue;

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
        await db.bookingRequest.update({
          where: { id: id },
          data: { status: 'RECUSADO' },
        });
        return NextResponse.json(
          {
            message:
              'Nenhum horário válido gerado. A solicitação foi recusada.',
          },
          { status: 400 },
        );
      }

      // --- VALIDAÇÕES DE CONFLITO
      const userPeriodConflict = await db.booking.findFirst({
        where: {
          userId: request.userId,
          OR: bookingsToCreate.map((b) => ({
            AND: [
              { startTime: { lt: b.endTime } },
              { endTime: { gt: b.startTime } },
            ],
          })),
        },
        include: { room: { select: { name: true } } },
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
        const conflictDate = roomConflict.startTime.toLocaleDateString(
          'pt-BR',
          { timeZone: 'UTC' },
        );
        return NextResponse.json(
          {
            message: `Conflito de horário encontrado. A sala já está reservada no dia ${conflictDate}.`,
          },
          { status: 409 },
        );
      }
      // --- FIM DAS VALIDAÇÕES ---

      await db.$transaction([
        db.booking.createMany({ data: bookingsToCreate }),
        db.bookingRequest.update({
          where: { id: id },
          data: { status: 'APROVADO' },
        }),
      ]);
      responseMessage = `${bookingsToCreate.length} reservas criadas e solicitação aprovada com sucesso.`;
      notificationMessage = `A sua solicitação para a turma "${request.classCode}" foi APROVADA.`;
    } else {
      await db.bookingRequest.update({
        where: { id: id },
        data: {
          status: 'RECUSADO',
          refusalReason: refusalReason || 'Sem justificativa.',
        },
      });
      responseMessage = 'Solicitação recusada com sucesso.';
      notificationMessage = `A sua solicitação para a turma "${request.classCode}" foi RECUSADA. Motivo: ${refusalReason || 'Não especificado'}`;
    }

    await db.notification.create({
      data: {
        message: notificationMessage,
        link: '/my-requests',
        userId: request.userId,
      },
    });

    const emailHtml = await render(
      UserStatusEmail({
        userName: request.user.name || 'Utilizador',
        classCode: request.classCode,
        status: status === 'APROVADO' ? 'aprovada' : 'recusada',
        refusalReason: status === 'RECUSADO' ? refusalReason : undefined,
      }),
    );
    try {
      await resend.emails.send({
        from: 'noreply@nexo.dev.br',
        to: request.user.email || '',
        subject: `Sua solicitação foi ${status}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error(
        'Falha ao enviar email de status, mas a ação foi concluída:',
        emailError,
      );
    }

    await db.auditLog.create({
      data: {
        action: `REQUEST_${status}`,
        details:
          `A solicitação para a turma "${request.classCode}" foi ${status === 'APROVADO' ? 'aprovada' : 'recusada'}. ${status === 'RECUSADO' ? `Motivo: ${refusalReason}` : ''}`.trim(),
        userId: session.user.id,
      },
    });

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
