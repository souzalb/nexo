// src/app/register/page.tsx
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// 1. Schema de validação com Zod, agora com mais campos
const registerSchema = z
  .object({
    name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    email: z.email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  // Usamos .refine() para validações que dependem de mais de um campo
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'], // O erro será associado a este campo
  });

// Extrair o tipo do schema
type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function CreateUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  // 2. Função de submissão para chamar nossa API de registro
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setError(null);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Se a resposta não for OK, pegamos a mensagem de erro da API
        setError(
          responseData.message || 'Falha ao registrar. Tente novamente.',
        );
        toast.error('Erro!');
        return;
      }

      // 3. Sucesso! Redirecionar para a página de login
      toast.success('Conta criada com sucesso!');
      router.push('/login');

      // O ideal aqui seria mostrar uma notificação de sucesso (toast)
      // antes de redirecionar.
    } catch (err) {
      setError('Ocorreu um erro inesperado. Verifique sua conexão.');
      console.log(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Criar Nova Conta
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Campo Nome */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nome Completo
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Campo Email */}
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

          {/* Campo Senha */}
          <div className="mb-4">
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

          {/* Campo Confirmar Senha */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:bg-indigo-300"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
