import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

// GET — Retorna estatísticas atuais para exibir na página
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const now = new Date();

    const [
      totalBookings,
      pastBookings,
      futureBookings,
      totalBookingRequests,
      pendingRequests,
      totalNotifications,
      totalAuditLogs,
    ] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { endTime: { lt: now } } }),
      db.booking.count({ where: { startTime: { gte: now } } }),
      db.bookingRequest.count(),
      db.bookingRequest.count({ where: { status: 'PENDENTE' } }),
      db.notification.count(),
      db.auditLog.count(),
    ]);

    return NextResponse.json({
      bookings: {
        total: totalBookings,
        past: pastBookings,
        future: futureBookings,
      },
      bookingRequests: {
        total: totalBookingRequests,
        pending: pendingRequests,
      },
      notifications: totalNotifications,
      auditLogs: totalAuditLogs,
    });
  } catch (error) {
    console.error('[DATA-LIBRARY GET]', error);
    return NextResponse.json(
      { message: 'Erro interno ao buscar estatísticas.' },
      { status: 500 },
    );
  }
}

// DELETE — Executa a limpeza de dados com base no tipo e escopo
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { target, scope } = body as {
      target: 'bookings' | 'requests' | 'notifications' | 'audit-logs' | 'all';
      scope: 'past' | 'all';
    };

    const now = new Date();
    const results: string[] = [];

    // --- RESERVAS ---
    if (target === 'bookings' || target === 'all') {
      const where = scope === 'past' ? { endTime: { lt: now } } : {};
      const { count } = await db.booking.deleteMany({ where });
      results.push(`${count} reserva(s) excluída(s)`);
    }

    // --- SOLICITAÇÕES DE RESERVA ---
    if (target === 'requests' || target === 'all') {
      const where =
        scope === 'past' ? { status: { in: ['APROVADO', 'RECUSADO'] } } : {};
      const { count } = await db.bookingRequest.deleteMany({ where });
      results.push(`${count} solicitação(ões) excluída(s)`);
    }

    // --- NOTIFICAÇÕES ---
    if (target === 'notifications' || target === 'all') {
      const where = scope === 'past' ? { read: true } : {};
      const { count } = await db.notification.deleteMany({ where });
      results.push(`${count} notificação(ões) excluída(s)`);
    }

    // --- LOGS DE AUDITORIA ---
    if (target === 'audit-logs' || target === 'all') {
      const { count } = await db.auditLog.deleteMany({});
      results.push(`${count} log(s) de auditoria excluído(s)`);
    }

    // Registrar ação no log de auditoria
    await db.auditLog.create({
      data: {
        action: 'DATA_LIBRARY_CLEANUP',
        details: `Limpeza executada: target=${target}, scope=${scope}. Resultados: ${results.join('; ')}`,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: `Limpeza concluída com sucesso! ${results.join('. ')}.`,
      results,
    });
  } catch (error) {
    console.error('[DATA-LIBRARY DELETE]', error);
    return NextResponse.json(
      { message: 'Erro interno ao executar limpeza.' },
      { status: 500 },
    );
  }
}
