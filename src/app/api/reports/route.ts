import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { parseISO, endOfDay } from 'date-fns';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    const classCode = searchParams.get('classCode');

    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const whereClause: any = {};

    if (startDate) {
      whereClause.startTime = {
        ...whereClause.startTime,
        gte: parseISO(startDate),
      };
    }
    if (endDate) {
      // Adiciona 23:59:59 à data final para garantir que o dia inteiro seja incluído
      whereClause.startTime = {
        ...whereClause.startTime,
        lte: endOfDay(parseISO(endDate)),
      };
    }
    if (userId) {
      whereClause.userId = userId;
    }
    if (roomId) {
      whereClause.roomId = roomId;
    }
    if (classCode) {
      whereClause.classCode = { contains: classCode, mode: 'insensitive' };
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        room: { select: { name: true } },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
