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
    // PASSO 1: Consumir o corpo da requisição. Esta linha é obrigatória vir primeiro.
    const body = await req.json();

    // PASSO 2: Agora que o body foi consumido, podemos acessar os params com segurança.
    const { id } = params;
    const dataToUpdate = updateRoomSchema.parse(body);

    const updatedRoom = await db.room.update({
      where: { id: id }, // Usando a variável 'id' que foi extraída após o await.
      data: dataToUpdate,
    });

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    console.error('ERRO NO PATCH:', error); // Adicionei um log de erro mais detalhado
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
    // 1. ANTES de deletar, verificamos se existem reservas para esta sala
    const existingBookingsCount = await db.booking.count({
      where: {
        roomId: params.id,
      },
    });

    // 2. Se houver reservas, retornamos um erro claro (409 Conflict)
    if (existingBookingsCount > 0) {
      return NextResponse.json(
        {
          message:
            'Esta sala não pode ser excluída pois possui reservas associadas. Por favor, remova as reservas primeiro.',
        },
        { status: 409 }, // 409 Conflict é um bom status para esta situação
      );
    }

    // 3. Se não houver reservas, procedemos com a exclusão
    await db.room.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Este bloco agora lidará com outros erros inesperados
    console.error('ERRO AO DELETAR SALA:', error);
    return NextResponse.json(
      { message: 'Erro interno ao tentar deletar a sala.' },
      { status: 500 },
    );
  }
}
