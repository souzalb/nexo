import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/app/_lib/auth';
import { db } from '@/app/_lib/prisma';
import { automaticReleaseAllowed } from '@/app/_lib/iot/rules';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN')
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 403 });
  const roomId = new URL(request.url).searchParams.get('roomId');
  const [rooms, runtime, bookings, emails] = await Promise.all([
    db.room.findMany({
      select: { id: true, name: true, iotConfig: true },
      orderBy: { name: 'asc' },
    }),
    db.iotRuntime.findUnique({ where: { id: 'collector' } }),
    db.booking.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        OR: [
          {
            room: { iotConfig: { isNot: null } },
            startTime: { lte: new Date() },
            endTime: { gte: new Date(Date.now() - 86400000) },
          },
          { releasedAt: { gte: new Date(Date.now() - 86400000) } },
        ],
      },
      include: {
        room: { select: { name: true } },
        user: { select: { name: true } },
        attendanceEvents: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    }),
    db.iotEmail.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
      select: { id: true, sentAt: true, expiresAt: true, error: true },
      take: 100,
    }),
  ]);
  return NextResponse.json(
    {
      rooms,
      runtime,
      bookings,
      emails,
      automaticAllowed: automaticReleaseAllowed(),
      emailConfigured:
        !!process.env.RESEND_API_KEY && !!process.env.IOT_EMAIL_FROM,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

const schema = z
  .object({
    roomId: z.string().min(1),
    deviceId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    topic: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-zA-Z0-9/_-]+$/)
      .refine((value) => !value.endsWith('/status')),
    mode: z.enum(['OFF', 'OBSERVE', 'AUTOMATIC']),
    warningMinutes: z.number().int().min(1).max(29),
    releaseMinutes: z.number().int().min(2).max(30),
    heartbeatSeconds: z.number().int().min(45).max(180),
  })
  .refine((value) => value.releaseMinutes > value.warningMinutes, {
    message: 'O prazo de decisão deve ser maior que o prazo do aviso.',
  });

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN')
    return NextResponse.json({ message: 'Não autorizado.' }, { status: 403 });
  try {
    const config = schema.parse(await request.json());
    if (config.mode === 'AUTOMATIC' && !automaticReleaseAllowed())
      return NextResponse.json(
        {
          message:
            'Configure broker privado autenticado com TLS e IOT_ALLOW_AUTOMATIC_RELEASE=true antes de habilitar a liberação automática.',
        },
        { status: 400 },
      );
    const existing = await db.roomIotConfig.findUnique({
      where: { roomId: config.roomId },
    });
    // Policy changes cannot turn a previously observed booking into an automatic cancellation.
    const changed =
      !existing ||
      Object.entries(config).some(
        ([key, value]) => existing[key as keyof typeof existing] !== value,
      );
    await db.$transaction(async (tx) => {
      await tx.roomIotConfig.upsert({
        where: { roomId: config.roomId },
        create: config,
        update: {
          ...config,
          ...(changed
            ? { healthySince: null, ready: false, lastMotionAt: null }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE_IOT_POLICY',
          details: `Configuração IoT da sala ${config.roomId}: ${config.mode}, aviso ${config.warningMinutes} min, decisão ${config.releaseMinutes} min.`,
        },
      });
    });
    return NextResponse.json({
      message:
        'Configuração salva. O coletor atualizará a assinatura no próximo ciclo.',
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { message: error.issues[0]?.message || 'Configuração inválida.' },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      return NextResponse.json(
        { message: 'Dispositivo ou tópico já está associado a outra sala.' },
        { status: 409 },
      );
    return NextResponse.json(
      { message: 'Não foi possível salvar a configuração.' },
      { status: 400 },
    );
  }
}
