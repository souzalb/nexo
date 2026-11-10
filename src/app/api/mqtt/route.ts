import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/_lib/auth';
import { getMqttMonitor } from '@/app/_lib/mqtt-monitor';
import { db } from '@/app/_lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }
  try {
    const roomId = new URL(request.url).searchParams.get('roomId');
    const config = roomId
      ? await db.roomIotConfig.findUnique({
          where: { roomId },
          select: { topic: true },
        })
      : null;
    if (roomId && !config)
      return NextResponse.json(
        { message: 'Esta sala ainda não tem um sensor configurado.' },
        { status: 404 },
      );
    return NextResponse.json(getMqttMonitor(config?.topic).snapshot(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          'Não foi possível iniciar o monitor. Verifique a configuração MQTT do servidor.',
      },
      { status: 503 },
    );
  }
}
