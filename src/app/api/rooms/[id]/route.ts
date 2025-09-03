import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

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
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, capacity, type, location, resourceIds } =
      updateRoomSchema.parse(body);

    const updatedRoom = await db.room.update({
      where: { id: params.id },
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

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    console.error('ERRO AO ATUALIZAR SALA:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

// ... (A sua função DELETE continua igual)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const existingBookingsCount = await db.booking.count({
      where: {
        roomId: params.id,
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

    await db.room.delete({
      where: { id: params.id },
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
