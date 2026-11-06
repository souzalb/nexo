import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/_lib/auth';
import { getMqttMonitor } from '@/app/_lib/mqtt-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }
  try {
    return NextResponse.json(getMqttMonitor().snapshot(), {
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
