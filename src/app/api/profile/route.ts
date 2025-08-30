import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';
import { db } from '@/app/_lib/prisma';

// Schema para validar a atualização dos dados do perfil
const profileUpdateSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.email('Email inválido'),
});

// Schema para validar a mudança de senha
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

// Handler para PATCH (Atualizar nome e email)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const dataToUpdate = profileUpdateSchema.parse(body);

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: 'Erro ao atualizar perfil' },
      { status: 500 },
    );
  }
}

// Handler para PUT (Mudar a senha)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = passwordChangeSchema.parse(body);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 },
      );
    }

    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'A senha atual está incorreta.' },
        { status: 400 },
      );
    }

    const hashedNewPassword = await hash(newPassword, 10);
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json(
      { message: 'Senha atualizada com sucesso!' },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { message: 'Erro ao atualizar senha' },
      { status: 500 },
    );
  }
}
