import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  // Qualquer utilizador autenticado pode ver os detalhes de uma sala
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const roomDetails = await db.room.findUnique({
      where: { id: params.id },
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
