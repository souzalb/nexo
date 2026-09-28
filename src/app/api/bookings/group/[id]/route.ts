import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/_lib/auth';
import { db } from '@/app/_lib/prisma';
import { z } from 'zod';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id: bookingGroupId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');

    if (!bookingGroupId || !startDate) {
      return NextResponse.json(
        { message: 'Parâmetros em falta.' },
        { status: 400 },
      );
    }

    // Busca uma das reservas para garantir que o utilizador tem permissão para a apagar
    const sampleBooking = await db.booking.findFirst({
      where: { bookingGroupId },
      select: { userId: true, requesterId: true },
    });

    if (!sampleBooking) {
      return NextResponse.json(
        { message: 'Grupo de reservas não encontrado.' },
        { status: 404 },
      );
    }

    if (
      session.user.role !== 'ADMIN' &&
      session.user.id !== sampleBooking.userId &&
      session.user.id !== sampleBooking.requesterId
    ) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 });
    }

    const deleteResult = await db.booking.deleteMany({
      where: {
        bookingGroupId: bookingGroupId,
        startTime: {
          gte: new Date(startDate), // "gte" = greater than or equal (maior ou igual a)
        },
      },
    });

    // Log de Auditoria
    await db.auditLog.create({
      data: {
        action: 'DELETE_RECURRING_BOOKINGS',
        details: `${deleteResult.count} reservas do grupo ${bookingGroupId} foram excluídas a partir de ${new Date(startDate).toLocaleDateString('pt-BR')}.`,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: `${deleteResult.count} reservas foram removidas com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao excluir reservas recorrentes:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}

const updateGroupBookingSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório').optional(),
  roomId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id: bookingGroupId } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');

    if (!bookingGroupId || !startDate) {
      return NextResponse.json(
        { message: 'Parâmetros em falta.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { title, roomId } = updateGroupBookingSchema.parse(body);

    const targetDate = new Date(startDate);

    // Busca as reservas alvo
    const targetBookings = await db.booking.findMany({
      where: {
        bookingGroupId,
        startTime: { gte: targetDate },
      },
    });

    if (targetBookings.length === 0) {
      return NextResponse.json(
        { message: 'Nenhuma reserva encontrada para atualizar.' },
        { status: 404 },
      );
    }

    // Verificação de Autorização baseada na primeira reserva
    const sampleBooking = targetBookings[0];
    if (
      session.user.role !== 'ADMIN' &&
      session.user.id !== sampleBooking.userId &&
      session.user.id !== sampleBooking.requesterId
    ) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 });
    }

    // Verificação de Conflitos em Lote (se a sala mudou)
    if (roomId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allConflicts: any[] = [];
      for (const booking of targetBookings) {
        if (booking.roomId !== roomId) {
          const conflicts = await db.booking.findMany({
            where: {
              roomId: roomId,
              id: { not: booking.id },
              AND: [
                { startTime: { lt: booking.endTime } },
                { endTime: { gt: booking.startTime } },
              ],
            },
            include: {
              room: { select: { name: true } },
              user: { select: { name: true } },
            },
          });

          allConflicts.push(...conflicts);
        }
      }

      if (allConflicts.length > 0) {
        // Deduplica
        const uniqueConflicts = Array.from(
          new Map(allConflicts.map((c) => [c.id, c])).values(),
        );
        return NextResponse.json(
          {
            message: `Foram encontrados ${uniqueConflicts.length} conflito(s) de horário na nova sala. A atualização em série foi abortada.`,
            conflicts: uniqueConflicts.map((c) => ({
              id: c.id,
              title: c.title,
              roomName: c.room.name,
              userName: c.user.name,
              startTime: c.startTime,
              endTime: c.endTime,
              classCode: c.classCode,
            })),
          },
          { status: 409 },
        );
      }
    }

    // Se passou na verificação de conflito, faz o update em lote
    const updateResult = await db.booking.updateMany({
      where: {
        bookingGroupId,
        startTime: { gte: targetDate },
      },
      data: {
        ...(title && { title }),
        ...(roomId && { roomId }),
      },
    });

    // Log de Auditoria
    await db.auditLog.create({
      data: {
        action: 'UPDATE_RECURRING_BOOKINGS',
        details: `${updateResult.count} reservas da série ${bookingGroupId} foram atualizadas a partir de ${targetDate.toLocaleDateString('pt-BR')}.`,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: `${updateResult.count} reservas atualizadas com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao atualizar reservas recorrentes:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
