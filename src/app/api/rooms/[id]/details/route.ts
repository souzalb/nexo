import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  // Qualquer utilizador autenticado pode ver os detalhes de uma sala
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const roomDetails = await db.room.findUnique({
      where: { id },
      include: {
        resources: { orderBy: { name: 'asc' } }, // Ordena os recursos alfabeticamente
        images: true,
      },
    });

    if (!roomDetails) {
      return NextResponse.json(
        { message: 'Sala não encontrada.' },
        { status: 404 },
      );
    }

    return NextResponse.json(roomDetails);
  } catch (error) {
    console.error('Erro ao buscar detalhes da sala:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
