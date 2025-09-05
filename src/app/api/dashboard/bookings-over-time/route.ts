import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { subDays, eachDayOfInterval, format } from 'date-fns';
import { db } from '@/app/_lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = parseInt(searchParams.get('range') || '30', 10);

    const endDate = new Date();
    const startDate = subDays(endDate, range - 1);

    // 1. Busca as reservas e agrupa por dia
    const bookingsByDay = await db.booking.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        _all: true,
      },
    });

    // 2. Cria um mapa para acesso rápido: 'YYYY-MM-DD' -> total
    const bookingsMap = new Map<string, number>();
    bookingsByDay.forEach((item) => {
      const dateKey = format(item.createdAt, 'yyyy-MM-dd');
      bookingsMap.set(dateKey, item._count._all);
    });

    // 3. Gera um array com todos os dias no intervalo e preenche com dados
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const chartData = allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        reservas: bookingsMap.get(dateKey) || 0, // A chave agora é "reservas"
      };
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Erro ao buscar dados para o gráfico:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
