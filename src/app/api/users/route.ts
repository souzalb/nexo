import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { db } from '@/app/_lib/prisma';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/app/_lib/auth';

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

    await db.auditLog.create({
      data: {
        action: 'CREATE_USER',
        details: `O usuário "${name}" foi criado como "${role}".`,
        userId: session.user.id,
      },
    });

    // Remove a senha da resposta por segurança
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    revalidatePath('/users');

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
