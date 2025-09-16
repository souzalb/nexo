import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { Period } from '@prisma/client';
import { Resend } from 'resend';
import { UserStatusEmail } from '@/emails/teacher-email';
import { render } from '@react-email/components';
import { db } from '@/app/_lib/prisma';

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
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { status } = await req.json(); // Espera "APROVADO" ou "RECUSADO"
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
      return NextResponse.json(
        { message: 'Status inválido.' },
        { status: 400 },
      );
    }

    // 1. Busca a solicitação e os dados do utilizador numa única operação.
    const request = await db.bookingRequest.findUnique({
      where: { id: params.id },
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

    if (status === 'APROVADO') {
      // --- LÓGICA DE APROVAÇÃO ---
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
          where: { id: params.id },
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

      // ... (verificações de conflito como antes)

      await db.$transaction([
        db.booking.createMany({ data: bookingsToCreate }),
        db.bookingRequest.update({
          where: { id: params.id },
          data: { status: 'APROVADO' },
        }),
      ]);
      responseMessage = `${bookingsToCreate.length} reservas criadas e solicitação aprovada com sucesso.`;
    } else {
      // status === 'RECUSADO'
      await db.bookingRequest.update({
        where: { id: params.id },
        data: { status: 'RECUSADO' },
      });
      responseMessage = 'Solicitação recusada com sucesso.';
    }

    // --- LÓGICA DE NOTIFICAÇÃO CENTRALIZADA ---
    // Notificação na aplicação
    await db.notification.create({
      data: {
        message: `Sua solicitação para a turma "${request.classCode}" foi ${status === 'APROVADO' ? 'aprovada' : 'recusada'}.`,
        link: '/my-bookings',
        userId: request.userId,
      },
    });

    // Notificação por email
    const emailHtml = await render(
      UserStatusEmail({
        userName: request.user.name || 'Utilizador',
        classCode: request.classCode,
        status: status === 'APROVADO' ? 'aprovada' : 'recusada',
      }),
    );

    try {
      console.log(request.user.email);
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [request.user.email],
        subject: `Atualização da sua Solicitação: ${request.classCode}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error(
        'Falha ao enviar email de status, mas a ação foi concluída:',
        emailError,
      );
    }

    // Log de Auditoria
    await db.auditLog.create({
      data: {
        action: `REQUEST_${status}`,
        details: `A solicitação para a turma "${request.classCode}" foi ${status === 'APROVADO' ? 'aprovada' : 'recusada'}.`,
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
