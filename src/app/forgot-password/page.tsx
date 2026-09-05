'use client';

import z from 'zod';
import { cn } from '../_lib/utils';
import { Button } from '../_components/ui/button';
import { Card, CardContent } from '../_components/ui/card';
import { Input } from '../_components/ui/input';
import { Label } from '../_components/ui/label';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';

const forgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
});

type ForgotPasswordInputs = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordInputs> = async (data) => {
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Erro ao processar a solicitação.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
                    <p className="text-muted-foreground text-balance">
                      Digite seu email e enviaremos um link para redefinir sua
                      senha.
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
                          ✅ Email enviado com sucesso!
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Se o email estiver cadastrado, você receberá um link
                          de redefinição de senha. Verifique sua caixa de
                          entrada e spam.
                        </p>
                      </div>
                      <Link href="/login">
                        <Button variant="outline" className="w-full">
                          Voltar para o Login
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="flex flex-col gap-6">
                        <div className="grid gap-3">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            placeholder="email@example.com"
                            required
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Enviando...' : 'Enviar Link'}
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
