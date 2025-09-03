// src/app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';
import { revalidatePath } from 'next/cache';

// Schema de validação para a criação de uma sala
const roomSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório'),
  capacity: z.number().int().positive('A capacidade deve ser positiva'),
  type: z.string().min(3, 'O tipo é obrigatório'),
  location: z.string().optional(),
  resourceIds: z.array(z.string()).optional(), // <-- ACEITA UMA LISTA DE IDs
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, capacity, type, location, resourceIds } =
      roomSchema.parse(body);

    const newRoom = await db.room.create({
      data: {
        name,
        capacity,
        type,
        location,
        // Conecta a sala aos recursos selecionados
        resources: {
          connect: resourceIds?.map((id) => ({ id })) || [],
        },
      },
    });
    revalidatePath('/rooms');
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Erro ao criar sala' },
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
    console.error('Erro ao buscar salas:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
