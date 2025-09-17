import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

const addImageSchema = z.object({
  url: z.string().url('Por favor, forneça um URL válido.'),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { url } = addImageSchema.parse(body);

    const newImage = await db.roomImage.create({
      data: {
        url,
        roomId: id,
      },
    });

    return NextResponse.json(newImage, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error('Erro ao adicionar imagem:', error);
    return NextResponse.json(
      { message: 'Erro ao adicionar imagem.' },
      { status: 500 },
    );
  }
}
