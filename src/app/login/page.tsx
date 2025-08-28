// src/app/login/page.tsx
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ModeToggle } from '../_components/mode-toggle';
import Link from 'next/link';

// 1. Definir o schema de validação com Zod
const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

// Extrair o tipo do schema para usar no formulário
type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  // 2. Função de submissão do formulário
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setError(null); // Limpar erros anteriores

    try {
      const result = await signIn('credentials', {
        ...data,
        redirect: false, // IMPORTANTE: evita o redirecionamento automático
      });

      if (result?.error) {
        // Se houver erro (ex: credenciais erradas), o NextAuth retorna aqui
        setError('Email ou senha inválidos. Tente novamente.');
        console.error('Falha no login:', result.error);
      } else if (result?.ok) {
        // 3. Se o login for bem-sucedido, redirecionar para o dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
      console.error('Erro de signIn:', err);
    }
  };

  return (
    <div className="bg-secondary flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-red-500">
          Acessar o Sistema
        </h2>
        <ModeToggle />
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="mb-4 rounded p-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:bg-indigo-300"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
