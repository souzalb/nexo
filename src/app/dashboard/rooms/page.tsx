// src/app/dashboard/rooms/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { db } from '@/app/_lib/prisma';
import RoomsManager from '@/app/_components/rooms-manager';

// Função para buscar os dados no servidor
async function getRooms() {
  const rooms = await db.room.findMany({
    orderBy: {
      name: 'asc',
    },
  });
  return rooms;
}

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  // Verificação de segurança: Apenas admins podem ver esta página
  if (session?.user.role !== 'ADMIN') {
    // Redireciona para o dashboard principal se não for admin
    redirect('/dashboard');
  }

  const initialRooms = await getRooms();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">
        Gerenciamento de Salas
      </h1>
      <RoomsManager initialRooms={initialRooms} />
    </div>
  );
}
