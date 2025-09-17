import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

const resourceSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório'),
});

// PATCH - Atualizar um recurso existente
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
    const { name } = resourceSchema.parse(body);

    const updatedResource = await db.resource.update({
      where: { id: params.id },
      data: { name },
    });

    await db.auditLog.create({
      data: {
        action: 'UPDATE_RESOURCE',
        details: `O recurso "${updatedResource.name}" foi atualizado.`,
        userId: session.user.id,
      },
    });
    return NextResponse.json(updatedResource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'Já existe um recurso com este nome.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: 'Erro ao atualizar recurso.' },
      { status: 500 },
    );
  }
}

// DELETE - Excluir um recurso
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    // Antes de excluir, verifica se o recurso está a ser utilizado por alguma sala
    const resourceInUse = await db.resource.findUnique({
      where: { id: params.id },
      include: { _count: { select: { rooms: true } } },
    });

    if (resourceInUse?._count.rooms && resourceInUse._count.rooms > 0) {
      return NextResponse.json(
        {
          message: `Este recurso não pode ser excluído pois está associado a ${resourceInUse._count.rooms} sala(s).`,
        },
        { status: 409 },
      );
    }

    const resourceName = await db.resource.findUnique({
      where: { id: params.id },
      select: { name: true },
    });

    await db.resource.delete({
      where: { id: params.id },
    });

    await db.auditLog.create({
      data: {
        action: 'DELETE_RESOURCE',
        details: `O recurso "${resourceName}" foi excluído.`,
        userId: session.user.id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Erro ao excluir recurso.' },
      { status: 500 },
    );
  }
}
