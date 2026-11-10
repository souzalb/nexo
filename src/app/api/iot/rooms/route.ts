import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/_lib/auth';
import { db } from '@/app/_lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN')
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 403 });
  const rooms = await db.room.findMany({
    select: {
      id: true,
      name: true,
      iotConfig: {
        select: {
          topic: true,
          deviceId: true,
          mode: true,
          warningMinutes: true,
          releaseMinutes: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(rooms, { headers: { 'Cache-Control': 'no-store' } });
}
