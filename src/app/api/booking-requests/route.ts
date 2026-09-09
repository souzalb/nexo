import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { Resend } from 'resend';
import { AdminNotificationEmail } from '@/emails/admin-email';
import { render } from '@react-email/components';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = requestSchema.parse(body);

    const targetUserId =
      ['ADMIN', 'MANAGER'].includes(session.user.role) && data.userId
        ? data.userId
        : session.user.id;

    const isOnBehalf = targetUserId !== session.user.id;

    // Cria o pedido e, na mesma operação, busca os dados relacionados necessários.
    const newRequest = await db.bookingRequest.create({
      data: {
        roomId: data.roomId,
        classCode: data.classCode,
        timeSlots: data.timeSlots,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        weekdays: data.weekdays,
        userId: targetUserId,
        requesterId: session.user.id,
      },
      include: {
        user: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    // Buscar nome do solicitante quando for em nome de outro
    let requesterDisplayName = newRequest.user.name;
    if (isOnBehalf) {
      const requester = await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      requesterDisplayName = `${newRequest.user.name} (solicitado por ${requester?.name || 'Manager'})`;
    }

    // Envio de notificação na aplicação
    const admins = await db.user.findMany({
      where: { role: 'ADMIN' },
    });
    await db.notification.createMany({
      data: admins.map((admin) => ({
        message: `Nova solicitação de ${requesterDisplayName} para a turma "${newRequest.classCode}".`,
        link: '/requests',
        userId: admin.id,
      })),
    });

    // Envio de notificação por email
    const adminEmails = admins
      .map((admin) => admin.email)
      .filter(Boolean) as string[];
    const emailHtml = await render(
      AdminNotificationEmail({
        requesterName: newRequest.user.name || 'Utilizador',
        classCode: newRequest.classCode,
        roomName: newRequest.room.name || 'N/A',
      }),
    );
    if (adminEmails.length > 0) {
      try {
        await resend.emails.send({
          from: 'noreply@nexo.dev.br',
          to: adminEmails,
          subject: `Nova Solicitação de Reserva: ${newRequest.classCode}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error(
          'Falha ao enviar email, mas a solicitação foi criada:',
          emailError,
        );
      }
    }

    // Log de Auditoria
    await db.auditLog.create({
      data: {
        action: 'CREATE_BOOKING_REQUEST',
        details: `Solicitação para a turma "${newRequest.classCode}" na sala "${newRequest.room.name}" foi criada.`,
        userId: session.user.id,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar solicitação de reserva:', error);

    return NextResponse.json(
      { message: 'Erro interno ao criar a solicitação.' },
      { status: 500 },
    );
  }
}
