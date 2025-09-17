import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

// Schema para atualização, agora com resourceIds
const updateRoomSchema = z.object({
  name: z.string().min(3).optional(),
  capacity: z.number().int().positive().optional(),
  type: z.string().min(3).optional(),
  location: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, capacity, type, location, resourceIds } =
      updateRoomSchema.parse(body);

    const updatedRoom = await db.room.update({
      where: { id },
      data: {
        name,
        capacity,
        type,
        location,
        // Usa `set` para substituir a lista de recursos pela nova lista enviada
        resources: {
          set: resourceIds?.map((id) => ({ id })) || [],
        },
      },
    });

    await db.auditLog.create({
      data: {
        action: 'UPDATE_ROOM',
        details: `A sala "${updatedRoom.name}" foi atualizada.`,
        userId: session.user.id,
      },
    });

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    console.error('ERRO AO ATUALIZAR SALA:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const existingBookingsCount = await db.booking.count({
      where: {
        roomId: id,
      },
    });

    if (existingBookingsCount > 0) {
      return NextResponse.json(
        {
          message:
            'Esta sala não pode ser excluída pois possui reservas associadas. Por favor, remova as reservas primeiro.',
        },
        { status: 409 },
      );
    }

    const roomToDelete = await db.room.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!roomToDelete) {
      return new NextResponse(null, { status: 204 });
    }

    await db.room.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        action: 'DELETE_ROOM',
        details: `A sala "${roomToDelete.name}" foi excluída.`,
        userId: session.user.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('ERRO AO DELETAR SALA:', error);
    return NextResponse.json(
      { message: 'Erro interno ao tentar deletar a sala.' },
      { status: 500 },
    );
  }
}
