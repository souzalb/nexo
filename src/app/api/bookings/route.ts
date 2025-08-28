// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  // Qualquer usuário logado pode ver as reservas
  if (!session) {
    //@typescript-eslint/no-unused-vars
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const bookings = await db.booking.findMany({
      // Incluímos dados do usuário e da sala em cada reserva
      include: {
        user: {
          select: { name: true }, // Selecionamos apenas o nome do usuário
        },
        room: {
          select: { name: true }, // E o nome da sala
        },
      },
    });

    // O FullCalendar espera um formato específico de 'eventos'.
    // Mapeamos nossos dados de reserva para este formato.
    const events = bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.title} (${booking.room.name})`,
      start: booking.startTime,
      end: booking.endTime,
      extendedProps: {
        userName: booking.user.name,
        roomName: booking.room.name,
      },
    }));

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('ERRO NA API:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor ao buscar reservas' },
      { status: 500 },
    );
  }
}
