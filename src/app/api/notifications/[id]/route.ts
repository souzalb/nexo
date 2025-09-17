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
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const notificationId = id;

  try {
    const updatedNotification = await db.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { message: 'Notificação não encontrada.' },
      { status: 404 },
    );
  }
}
