import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/app/_lib/prisma';

const resourceSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório'),
});

// GET - Listar todos os recursos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  const resources = await db.resource.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(resources);
}

// POST - Criar um novo recurso
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name } = resourceSchema.parse(body);

    const newResource = await db.resource.create({
      data: { name },
    });
    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    // Erro de validação do Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.message }, { status: 400 });
    }

    // Erro de violação de constraint única do Prisma (recurso já existe)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'Já existe um recurso com este nome.' },
        { status: 409 },
      );
    }

    // Outros erros
    console.error('Erro ao criar recurso:', error);
    return NextResponse.json(
      { message: 'Erro interno ao criar o recurso.' },
      { status: 500 },
    );
  }
}
