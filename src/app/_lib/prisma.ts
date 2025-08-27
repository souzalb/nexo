// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Evita que múltiplas instâncias do Prisma Client sejam criadas em ambiente de desenvolvimento
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // Opcional: loga as queries no console
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
