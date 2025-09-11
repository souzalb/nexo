import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { endOfDay, parseISO } from 'date-fns';
import { db } from '@/app/_lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 25;
    const skip = (page - 1) * limit;

    // --- LÓGICA DE FILTROS ---
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const whereClause: any = {};
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = { contains: action, mode: 'insensitive' };
    if (startDate)
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: parseISO(startDate),
      };
    if (endDate)
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: endOfDay(parseISO(endDate)),
      };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: whereClause, // Aplica os filtros à busca
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      db.auditLog.count({ where: whereClause }), // Aplica os filtros à contagem total
    ]);

    const pageCount = Math.ceil(total / limit);

    return NextResponse.json({
      logs,
      pagination: { total, pageCount, currentPage: page, limit },
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
