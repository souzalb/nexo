// src/app/api/register/route.ts
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/app/_lib/prisma';

// Schema de validação com Zod
const userSchema = z.object({
  name: z.string().min(3, 'O nome precisa ter no mínimo 3 caracteres.'),
  email: z.email('Email inválido.'),
  password: z.string().min(6, 'A senha precisa ter no mínimo 6 caracteres.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = userSchema.parse(body);

    // 1. Verificar se o email já existe
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso.' },
        { status: 409 }, // 409 Conflict
      );
    }

    // 2. Criptografar (hash) a senha
    const hashedPassword = await hash(password, 10);

    // 3. Criar o usuário no banco
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Remover a senha do objeto de resposta
    // @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    //@typescript-eslint/no-unused-vars

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Usuário criado com sucesso!' },
      { status: 201 }, // 201 Created
    );
  } catch (error) {
    // Tratamento de erros de validação do Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.name },
        { status: 400 },
      );
    }

    // Erro genérico
    return NextResponse.json(
      { message: 'Ocorreu um erro no servidor.' },
      { status: 500 },
    );
  }
}
