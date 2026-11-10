import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/_lib/auth';
import { db } from '@/app/_lib/prisma';
import { confirmAttendance, releaseManually } from '@/app/_lib/iot/service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id)
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !['confirm', 'release'].includes(body.action))
    return NextResponse.json({ message: 'Ação inválida.' }, { status: 400 });
  if (body.action === 'release' && session.user.role !== 'ADMIN')
    return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 });
  const { id } = await params;
  const result =
    body.action === 'confirm'
      ? await confirmAttendance(
          db,
          id,
          session.user.id,
          session.user.role === 'ADMIN',
        )
      : await releaseManually(db, id, session.user.id);
  return NextResponse.json(
    { message: result.message },
    { status: result.status },
  );
}
