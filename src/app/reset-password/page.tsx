'use client';

import z from 'zod';
import { Button } from '../_components/ui/button';
import { Card, CardContent } from '../_components/ui/card';
import { Input } from '../_components/ui/input';
import { Label } from '../_components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ResetPasswordInputs = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInputs>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit: SubmitHandler<ResetPasswordInputs> = async (data) => {
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Token de redefinição não encontrado.');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erro ao redefinir a senha.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          Link de redefinição inválido. Solicite um novo link.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full">Solicitar Novo Link</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold">Redefinir Senha</h1>
        <p className="text-muted-foreground text-balance">
          Digite sua nova senha abaixo.
        </p>
      </div>

      {error && (
        <div className="rounded p-3 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {success ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              ✅ Senha redefinida com sucesso!
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Você será redirecionado para a tela de login em instantes...
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Ir para o Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="Mínimo 6 caracteres"
                required
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                placeholder="Repita a nova senha"
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-muted-foreground text-sm underline-offset-2 hover:underline"
              >
                ← Voltar para o Login
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                <Suspense
                  fallback={
                    <div className="text-muted-foreground text-center text-sm">
                      Carregando...
                    </div>
                  }
                >
                  <ResetPasswordForm />
                </Suspense>
              </div>
              <div className="bg-muted relative hidden md:block">
                <div className="relative h-full w-full">
                  <Image
                    src="/img_login.png"
                    alt="Logo Nexo"
                    fill
                    className="inset-0 object-cover dark:brightness-[0.2] dark:grayscale"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
