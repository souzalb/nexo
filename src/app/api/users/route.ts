import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

import { z } from 'zod';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { db } from '@/app/_lib/prisma';

// Schema para validar a criação de um novo usuário
const createUserSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório'),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.nativeEnum(Role),
});

// Handler para POST (Criar um novo usuário)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // Apenas admins podem criar novos usuários
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = createUserSchema.parse(body);

    // Verifica se o email já existe
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso.' },
        { status: 409 },
      );
    }

    // Criptografa a senha
    const hashedPassword = await hash(password, 10);

    // Cria o usuário no banco
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    // Remove a senha da resposta por segurança
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: 'Erro ao criar usuário' },
      { status: 500 },
    );
  }
}
