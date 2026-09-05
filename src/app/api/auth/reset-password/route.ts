import { NextResponse } from 'next/server';
import { db } from '@/app/_lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres.' },
        { status: 400 },
      );
    }

    // Buscar o token no banco
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido ou já utilizado.' },
        { status: 400 },
      );
    }

    // Verificar se o token expirou
    if (new Date() > resetToken.expiresAt) {
      // Deletar token expirado
      await db.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return NextResponse.json(
        { error: 'Este link expirou. Solicite uma nova redefinição de senha.' },
        { status: 400 },
      );
    }

    // Hash da nova senha
    const hashedPassword = await hash(password, 10);

    // Atualizar senha do usuário e deletar o token em uma transação
    await db.$transaction([
      db.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({
      message: 'Senha redefinida com sucesso!',
    });
  } catch (error) {
    console.error('Erro no reset-password:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
