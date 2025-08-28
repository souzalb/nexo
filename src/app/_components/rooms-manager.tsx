// src/components/RoomsManager.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Room } from '@prisma/client';

const roomSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  capacity: z
    .number()
    .int()
    .positive('A capacidade deve ser um número positivo'),
  type: z.string().min(3, 'O tipo é obrigatório'),
  location: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface RoomsManagerProps {
  initialRooms: Room[];
}

export default function RoomsManager({ initialRooms }: RoomsManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
  });

  const handleAddRoom = async (data: RoomFormData) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Falha ao criar sala');

      setIsModalOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Não foi possível adicionar a sala.');
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          + Adicionar Sala
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Nome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Tipo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Capacidade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {initialRooms.map((room) => (
            <tr key={room.id}>
              <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                {room.name}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                {room.type}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                {room.capacity}
              </td>
              <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                {/* Botões de Editar e Deletar virão aqui */}
                <a href="#" className="text-indigo-600 hover:text-indigo-900">
                  Editar
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">Adicionar Nova Sala</h2>
            <form onSubmit={handleSubmit(handleAddRoom)} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nome da Sala
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Capacidade
                </label>
                <input
                  id="capacity"
                  type="number"
                  {...register('capacity', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.capacity && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tipo (Ex: Laboratório, Auditório)
                </label>
                <input
                  id="type"
                  type="text"
                  {...register('type')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.type && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Localização (Opcional)
                </label>
                <input
                  id="location"
                  type="text"
                  {...register('location')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.location.message}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
