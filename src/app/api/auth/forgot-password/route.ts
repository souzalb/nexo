import { NextResponse } from 'next/server';
import { db } from '@/app/_lib/prisma';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { ResetPasswordEmail } from '@/emails/reset-password-email';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'O email é obrigatório.' },
        { status: 400 },
      );
    }

    // Sempre retornar sucesso para não revelar se o email existe
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Retorna sucesso mesmo assim (segurança)
      return NextResponse.json({
        message:
          'Se o email estiver cadastrado, você receberá um link de redefinição.',
      });
    }

    // Deletar tokens anteriores do mesmo email
    await db.passwordResetToken.deleteMany({
      where: { email },
    });

    // Gerar token seguro
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Gerar link de redefinição
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Renderizar e enviar email
    const emailHtml = await render(
      ResetPasswordEmail({
        userName: user.name || 'Usuário',
        resetLink,
      }),
    );

    try {
      await resend.emails.send({
        from: 'noreply@nexo.dev.br',
        to: email,
        subject: 'Redefinição de Senha - NEXO',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Falha ao enviar email de redefinição:', emailError);
      // Não expor o erro ao usuário
    }

    return NextResponse.json({
      message:
        'Se o email estiver cadastrado, você receberá um link de redefinição.',
    });
  } catch (error) {
    console.error('Erro no forgot-password:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    );
  }
}
