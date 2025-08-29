import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { z } from 'zod';
import { Role } from '@prisma/client';
import { db } from '@/app/_lib/prisma';

// Schema para validar os dados da atualização
const updateUserSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório'),
  email: z.email('Email inválido'),
  role: z.nativeEnum(Role), // Valida contra as permissões do seu banco
});

// Handler para PATCH (Atualizar um usuário)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  // Impede que um admin mude sua própria permissão para não se trancar fora do sistema
  if (session.user.id === params.id) {
    const bodyCheck = await req.clone().json();
    if (bodyCheck.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Você não pode alterar sua própria permissão.' },
        { status: 400 },
      );
    }
  }

  try {
    const body = await req.json();
    const dataToUpdate = updateUserSchema.parse(body);

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: 'Erro ao atualizar usuário' },
      { status: 500 },
    );
  }
}

// Handler para DELETE (Deletar um usuário)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  if (session.user.id === params.id) {
    return NextResponse.json(
      { message: 'Você não pode excluir sua própria conta.' },
      { status: 400 },
    );
  }

  try {
    const bookingsCount = await db.booking.count({
      where: { userId: params.id },
    });
    if (bookingsCount > 0) {
      return NextResponse.json(
        {
          message:
            'Este usuário не pode ser excluído pois possui reservas ativas.',
        },
        { status: 409 },
      );
    }

    await db.user.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: 'Erro ao deletar usuário.' },
      { status: 500 },
    );
  }
}
