// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';
import z from 'zod';

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

const createBookingSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório'),
  roomId: z.string(),
  startTime: z.string().transform((dateString) => new Date(dateString)),
  endTime: z.string().transform((dateString) => new Date(dateString)),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, roomId, startTime, endTime } =
      createBookingSchema.parse(body);

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // --- LÓGICA CRÍTICA: VERIFICAÇÃO DE CONFLITO ---
    const existingBooking = await db.booking.findFirst({
      where: {
        roomId: roomId,
        // Procura por qualquer reserva que se sobreponha ao novo horário
        AND: [
          { startTime: { lt: endDate } }, // O início da reserva existente é ANTES do fim da nova
          { endTime: { gt: startDate } }, // O fim da reserva existente é DEPOIS do início da nova
        ],
      },
    });

    if (existingBooking) {
      // Se encontrarmos uma reserva, retornamos um erro de conflito
      return NextResponse.json(
        { message: 'Este horário já está reservado para a sala selecionada.' },
        { status: 409 }, // 409 Conflict
      );
    }

    // Se não houver conflito, criamos a reserva
    const newBooking = await db.booking.create({
      data: {
        title,
        startTime: startDate,
        endTime: endDate,
        userId: session.user.id,
        roomId: roomId,
      },
    });

    return NextResponse.json(newBooking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
