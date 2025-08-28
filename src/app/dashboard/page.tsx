// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import SignOutButton from '../_components/sign-out-button';

export default async function DashboardPage() {
  // 1. Obter a sessão no lado do servidor.
  // É a forma mais segura de verificar se o usuário está logado.
  const session = await getServerSession(authOptions);

  // 2. Embora o middleware já proteja a rota, esta é uma dupla verificação.
  // Se por algum motivo a sessão não for encontrada, redireciona para o login.
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 text-center shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">
          Bem-vindo(a) ao Dashboard!
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Olá, <span className="font-semibold">{session.user?.name}</span>!
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Seu email é: {session.user?.email}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Sua permissão é:{' '}
          <span className="font-medium text-indigo-600 uppercase">
            {session.user?.role}
          </span>
        </p>

        <div className="mt-8 border-t pt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
