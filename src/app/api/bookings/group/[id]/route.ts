import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/_lib/auth';
import { db } from '@/app/_lib/prisma';

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
      select: { userId: true },
    });

    if (!sampleBooking) {
      return NextResponse.json(
        { message: 'Grupo de reservas não encontrado.' },
        { status: 404 },
      );
    }

    if (
      session.user.role !== 'ADMIN' &&
      session.user.id !== sampleBooking.userId
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
