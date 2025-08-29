import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { hash } from 'bcryptjs';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/app/_lib/prisma';

// Handler para POST, que irá resetar a senha de um usuário
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  // Apenas administradores podem resetar senhas
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  // Um admin não pode resetar a própria senha por este método por segurança
  if (session.user.id === params.id) {
    return NextResponse.json(
      { message: 'Você não pode resetar sua própria senha por este painel.' },
      { status: 400 },
    );
  }

  try {
    const defaultPassword = '123456';
    const hashedPassword = await hash(defaultPassword, 10);

    // Atualiza apenas o campo da senha do usuário
    await db.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: 'Senha do usuário foi resetada para "123456" com sucesso!' },
      { status: 200 },
    );
  } catch (error) {
    console.error('ERRO AO RESETAR SENHA:', error);
    return NextResponse.json(
      { message: 'Erro ao resetar a senha.' },
      { status: 500 },
    );
  }
}
