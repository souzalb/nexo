// src/components/RoomsManager.tsx
'use client';

import { useState, useEffect } from 'react'; // Adicionamos useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Room } from '@prisma/client';
import { Card, CardContent } from './ui/card';
import Image from 'next/image';
import { toast } from 'sonner';

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
  const router = useRouter();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue, // Usaremos para preencher o formulário
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
  });

  // --- Efeito para preencher o formulário quando uma sala for selecionada para edição ---
  useEffect(() => {
    if (selectedRoom) {
      // Preenche os campos do formulário com os dados da sala selecionada
      setValue('name', selectedRoom.name);
      setValue('capacity', selectedRoom.capacity);
      setValue('type', selectedRoom.type);

      setValue('location', selectedRoom.location || '');
    }
  }, [selectedRoom, setValue]);

  const handleOpenFormModal = (room: Room | null) => {
    setSelectedRoom(room); // Se for null, é modo de adição. Se tiver uma sala, é edição.
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedRoom(null);
    reset(); // Limpa o formulário ao fechar
  };

  // --- 2. HANDLER DO FORMULÁRIO ATUALIZADO (ADICIONAR E EDITAR) ---
  const handleFormSubmit = async (data: RoomFormData) => {
    const isEditing = !!selectedRoom;
    const url = isEditing ? `/api/rooms/${selectedRoom.id}` : '/api/rooms';
    const method = isEditing ? 'PATCH' : 'POST';
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok)
        throw new Error(
          `Falha ao ${selectedRoom ? 'atualizar' : 'criar'} sala`,
        );

      toast.success(`Sala ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      handleCloseFormModal();
      router.refresh(); // Revalida os dados da página
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // --- 3. FUNCIONALIDADE DE EXCLUSÃO ---
  const handleOpenDeleteModal = (room: Room) => {
    setSelectedRoom(room);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedRoom(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRoom) return;

    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      toast.success('Sala excluída com sucesso!');
      handleCloseDeleteModal();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => handleOpenFormModal(null)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          + Adicionar Sala
        </button>
      </div>
      <div className="grid grid-cols-4 gap-5">
        {initialRooms.map((room) => (
          <Card key={room.id}>
            <CardContent>
              <div className="flex flex-col gap-5">
                <div className="relative h-[200px] w-full rounded-4xl">
                  <Image
                    src="/lab1.jpg"
                    alt="laboratorio"
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
                <div>
                  <p>Nome da sala: {room.name}</p>
                  <p>Tipo: {room.type}</p>
                  <p>Capacidade: {room.capacity} alunos</p>
                  <p>Localização: {room.location}</p>
                </div>
                <button
                  onClick={() => handleOpenFormModal(room)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleOpenDeleteModal(room)}
                  className="text-red-600 hover:text-red-900"
                >
                  Excluir
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal do Formulário (Adicionar/Editar) */}
      {isFormModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">
              {selectedRoom ? 'Editar Sala' : 'Adicionar Nova Sala'}
            </h2>
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
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
                  onClick={handleCloseFormModal}
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

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && selectedRoom && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-8">
            <h2 className="mb-4 text-xl font-bold">Confirmar Exclusão</h2>
            <p>
              Tem certeza que deseja excluir a sala &ldquo;{selectedRoom.name}
              &rdquo;? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={handleCloseDeleteModal}
                className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
