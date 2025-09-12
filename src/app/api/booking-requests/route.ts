import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

const requestSchema = z.object({
  roomId: z.string().min(1),
  classCode: z.string().min(1),
  timeSlots: z.array(z.string()).min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  weekdays: z.array(z.number()),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = requestSchema.parse(body);

    const newRequest = await db.bookingRequest.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        userId: session.user.id,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return NextResponse.json(
      { message: 'Erro ao criar solicitação.' },
      { status: 500 },
    );
  }
}
