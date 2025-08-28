// src/app/api/bookings/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

// Schema para atualização de uma reserva
const updateBookingSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório').optional(),
  // Aceitamos a string e a transformamos em um objeto Date
  startTime: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endTime: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  // Podemos adicionar roomId aqui se quisermos permitir a troca de sala
  roomId: z.string().optional(),
});

// Handler para PATCH (Atualizar uma reserva)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  // 1. Encontrar a reserva que será atualizada
  const bookingToUpdate = await db.booking.findUnique({
    where: { id: params.id },
  });

  if (!bookingToUpdate) {
    return NextResponse.json(
      { message: 'Reserva não encontrada' },
      { status: 404 },
    );
  }

  // 2. VERIFICAÇÃO DE AUTORIZAÇÃO
  if (
    session.user.role !== 'ADMIN' &&
    bookingToUpdate.userId !== session.user.id
  ) {
    return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, startTime, endTime, roomId } =
      updateBookingSchema.parse(body);

    // 3. --- NOVA LÓGICA DE VERIFICAÇÃO DE CONFLITO ---
    // Se a sala foi alterada, precisamos verificar a disponibilidade na nova sala.
    if (roomId && roomId !== bookingToUpdate.roomId) {
      const existingBooking = await db.booking.findFirst({
        where: {
          roomId: roomId, // Verifica na NOVA sala
          id: { not: params.id }, // Exclui a própria reserva que estamos editando
          // Procura por sobreposição de horários
          AND: [
            { startTime: { lt: bookingToUpdate.endTime } },
            { endTime: { gt: bookingToUpdate.startTime } },
          ],
        },
      });

      if (existingBooking) {
        return NextResponse.json(
          { message: 'Conflito de horário na nova sala selecionada.' },
          { status: 409 }, // 409 Conflict
        );
      }
    }

    const updatedBooking = await db.booking.update({
      where: { id: params.id },
      data: {
        title,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        roomId,
      },
    });

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    // ... Zod e outros tratamentos de erro ...
    console.log('ERRO NA API:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

// Handler para DELETE (Excluir/Cancelar uma reserva)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  // 1. Encontrar a reserva que será deletada
  const bookingToDelete = await db.booking.findUnique({
    where: { id: params.id },
  });

  if (!bookingToDelete) {
    return NextResponse.json(
      { message: 'Reserva não encontrada' },
      { status: 404 },
    );
  }

  // 2. VERIFICAÇÃO DE AUTORIZAÇÃO
  if (
    session.user.role !== 'ADMIN' &&
    bookingToDelete.userId !== session.user.id
  ) {
    return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
  }

  try {
    await db.booking.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log('ERRO NA API:', error);
    return NextResponse.json(
      { message: 'Erro ao deletar reserva' },
      { status: 500 },
    );
  }
}
