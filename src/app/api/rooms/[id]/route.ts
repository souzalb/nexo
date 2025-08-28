// src/app/api/rooms/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

// Schema para atualização (todos os campos são opcionais)
const updateRoomSchema = z.object({
  name: z.string().min(3).optional(),
  capacity: z.number().int().positive().optional(),
  type: z.string().min(3).optional(),
  location: z.string().optional(),
});

// Handler para PATCH (Atualizar uma sala)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const dataToUpdate = updateRoomSchema.parse(body);

    const updatedRoom = await db.room.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    // ... tratamento de erros similar ao POST
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

// Handler para DELETE (Deletar uma sala)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    await db.room.delete({
      where: { id: params.id },
    });
    // Retorna uma resposta vazia com status 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Pode falhar se a sala tiver reservas associadas (foreign key constraint)
    return NextResponse.json(
      {
        message:
          'Erro ao deletar sala. Verifique se existem reservas associadas.',
      },
      { status: 500 },
    );
  }
}
