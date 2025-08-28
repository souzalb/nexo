// src/app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

// Schema de validação para a criação de uma sala
const roomSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  capacity: z
    .number()
    .int()
    .positive('A capacidade deve ser um número positivo'),
  type: z.string().min(3, 'O tipo é obrigatório'),
  location: z.string().optional(),
});

// Handler para POST (Criar uma nova sala)
export async function POST(req: Request) {
  // 1. Verificar se o usuário é um ADMIN
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, capacity, type, location } = roomSchema.parse(body);

    const newRoom = await db.room.create({
      data: {
        name,
        capacity,
        type,
        location,
        // resources pode ser adicionado aqui se vier do form
      },
    });

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

// Handler para GET (Listar todas as salas)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const rooms = await db.room.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
