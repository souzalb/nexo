'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Resource } from '@prisma/client';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { IconEdit, IconTrash } from '@tabler/icons-react';

// O tipo Room agora inclui a relação com os recursos
type RoomWithResources = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
};

// Schema Zod para validação do formulário, agora com resourceIds
const roomSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  capacity: z
    .number()
    .int()
    .positive('A capacidade deve ser um número positivo'),
  type: z.string().min(3, 'O tipo é obrigatório (Ex: Laboratório)'),
  location: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface RoomsManagerProps {
  initialRooms: RoomWithResources[];
  allResources: Resource[];
}

export default function RoomsManager({
  initialRooms,
  allResources,
}: RoomsManagerProps) {
  const router = useRouter();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithResources | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      resourceIds: [],
    },
  });

  // Preenche o formulário quando uma sala é selecionada para edição
  useEffect(() => {
    if (selectedRoom && isFormModalOpen) {
      setValue('name', selectedRoom.name);
      setValue('capacity', selectedRoom.capacity);
      setValue('type', selectedRoom.type);
      setValue('location', selectedRoom.location || '');
      // Mapeia os recursos da sala para uma lista de IDs para o formulário
      setValue(
        'resourceIds',
        selectedRoom.resources.map((r) => r.id),
      );
    }
  }, [selectedRoom, isFormModalOpen, setValue]);

  const handleOpenFormModal = (room: RoomWithResources | null) => {
    setSelectedRoom(room);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedRoom(null);
    reset();
  };

  // Handler unificado para submissão do formulário
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

      if (!response.ok) {
        throw new Error(`Falha ao ${isEditing ? 'atualizar' : 'criar'} sala`);
      }

      toast.success(`Sala ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      handleCloseFormModal();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (room: RoomWithResources) => {
    toast.error(`Tem certeza que deseja excluir a sala "${room.name}"?`, {
      action: {
        label: 'Confirmar Exclusão',
        onClick: async () => {
          try {
            const response = await fetch(`/api/rooms/${room.id}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message);
            }
            toast.success('Sala excluída com sucesso!');
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => handleOpenFormModal(null)}>
          + Adicionar Sala
        </Button>
      </div>

      <div className="overflow-x-auto">
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
                Recursos
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
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                  {room.resources.map((r) => r.name).join(', ') || '-'}
                </td>
                <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenFormModal(room)}
                  >
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(room)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormModalOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-6 text-xl font-bold">
              {selectedRoom ? 'Editar Sala' : 'Adicionar Nova Sala'}
            </h2>
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nome da Sala
                  </label>
                  <Input id="name" {...register('name')} />
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
                  <Input
                    id="capacity"
                    type="number"
                    {...register('capacity', { valueAsNumber: true })}
                  />
                  {errors.capacity && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.capacity.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Tipo (Ex: Laboratório)
                  </label>
                  <Input id="type" {...register('type')} />
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
                  <Input id="location" {...register('location')} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Recursos
                </label>
                <Controller
                  name="resourceIds"
                  control={control}
                  render={({ field }) => (
                    <div className="mt-2 grid grid-cols-2 gap-4 rounded-md border p-4">
                      {allResources.map((resource) => (
                        <div key={resource.id} className="flex items-center">
                          <Checkbox
                            id={`resource-${resource.id}`}
                            checked={field.value?.includes(resource.id)}
                            onCheckedChange={(checked) => {
                              const currentIds = field.value || [];
                              if (checked) {
                                field.onChange([...currentIds, resource.id]);
                              } else {
                                field.onChange(
                                  currentIds.filter((id) => id !== resource.id),
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`resource-${resource.id}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {resource.name}
                          </label>
                        </div>
                      ))}
                      {allResources.length === 0 && (
                        <p className="col-span-2 text-sm text-gray-500">
                          Nenhum recurso cadastrado. Adicione recursos na página
                          de Gestão de Recursos.
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseFormModal}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'A salvar...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
