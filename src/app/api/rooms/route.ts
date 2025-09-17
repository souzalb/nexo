import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

// Schema para criar/atualizar uma sala, aceitando uma lista de IDs de recursos
const roomSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório'),
  capacity: z.number().int().positive('A capacidade deve ser positiva'),
  type: z.string().min(3, 'O tipo é obrigatório'),
  location: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
});

// GET - Listar todas as salas (já deve existir no seu projeto)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  const rooms = await db.room.findMany({
    orderBy: { name: 'asc' },
    include: { resources: true, images: true },
  });
  return NextResponse.json(rooms);
}

// POST - Criar uma nova sala (COM A CORREÇÃO)
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
        resources: {
          connect: resourceIds?.map((id) => ({ id })) || [],
        },
      },
    });

    await db.auditLog.create({
      data: {
        action: 'CREATE_ROOM',
        details: `A sala "${newRoom.name}" com capacidade para ${newRoom.capacity} pessoas foi criada.`,
        userId: session.user.id,
      },
    });

    // Após criar, buscamos novamente o registo completo com as relações (incluindo a lista de imagens vazia).
    const newRoomWithRelations = await db.room.findUnique({
      where: { id: newRoom.id },
      include: {
        resources: true,
        images: true, // Garante que o array `images: []` seja incluído na resposta
      },
    });

    return NextResponse.json(newRoomWithRelations, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Erro ao criar sala:', error);
    return NextResponse.json(
      { message: 'Erro ao criar sala' },
      { status: 500 },
    );
  }
}
