'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Resource, RoomImage } from '@prisma/client';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { IconTrash, IconX } from '@tabler/icons-react';
import { ImageUploader } from './image-uploader';
import Image from 'next/image';

// Tipos e Schema
type RoomWithRelations = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: Resource[];
  images: RoomImage[];
};
const roomSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  capacity: z
    .number()
    .int()
    .positive('A capacidade deve ser um número positivo'),
  type: z.string().min(3, 'O tipo é obrigatório'),
  location: z.string().optional(),
  resourceIds: z.array(z.string()).optional(),
});
type RoomFormData = z.infer<typeof roomSchema>;

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomWithRelations | null | undefined; // Recebe a sala a ser editada ou null para criar
  allResources: Resource[];
}

export function RoomFormModal({
  isOpen,
  onClose,
  room,
  allResources,
}: RoomFormModalProps) {
  const router = useRouter();
  // Este estado interno é crucial para a transição suave de "criar" para "editar"
  // e para garantir que o modal tenha sempre os dados mais recentes.
  const [internalRoom, setInternalRoom] = useState(room);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: { resourceIds: [] },
  });

  // Efeito ÚNICO para sincronizar o estado interno com a prop externa E preencher o formulário.
  useEffect(() => {
    // Sincroniza o estado interno sempre que a prop externa (do pai) mudar.
    // Isto é crucial para depois de um router.refresh().
    setInternalRoom(room);

    if (room && isOpen) {
      // Preenche o formulário com os dados da sala atual.
      setValue('name', room.name);
      setValue('capacity', room.capacity);
      setValue('type', room.type);
      setValue('location', room.location || '');
      setValue(
        'resourceIds',
        room.resources.map((r) => r.id),
      );
    } else {
      // Se não houver sala (modo de criação) ou o modal fechar, limpa o formulário.
      reset();
    }
  }, [room, isOpen, setValue, reset]);

  const handleFormSubmit = async (data: RoomFormData) => {
    const isEditing = !!internalRoom;
    const url = isEditing ? `/api/rooms/${internalRoom.id}` : '/api/rooms';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(
          responseData.message || 'Falha ao salvar dados da sala.',
        );

      toast.success(
        `Dados da sala ${isEditing ? 'atualizados' : 'criados'} com sucesso!`,
      );
      if (!isEditing) {
        // Após criar, atualizamos o estado INTERNO para transformar o modal em modo de edição.
        setInternalRoom(responseData);
      }
      router.refresh();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleAddImage = async (imageUrl: string) => {
    if (!internalRoom) return;
    try {
      const response = await fetch(`/api/rooms/${internalRoom.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao guardar imagem.');
      }
      toast.success('Imagem guardada com sucesso!');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    toast.error('Tem a certeza que deseja remover esta imagem?', {
      action: {
        label: 'Confirmar Remoção',
        onClick: async () => {
          try {
            const response = await fetch(`/api/images/${imageId}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Falha ao remover imagem.');
            toast.success('Imagem removida com sucesso!');
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => toast.dismiss() },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8">
        <div className="flex items-start justify-between">
          <h2 className="mb-6 text-xl font-bold">
            {internalRoom ? 'Editar Sala' : 'Adicionar Nova Sala'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="-mt-2 -mr-2"
          >
            <IconX />
          </Button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
                      Nenhum recurso cadastrado.
                    </p>
                  )}
                </div>
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A salvar...' : 'Salvar Dados da Sala'}
            </Button>
          </div>
        </form>

        {internalRoom && (
          <div className="mt-6 space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Gerir Fotos</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {internalRoom.images?.map((image) => (
                <div key={image.id} className="group relative">
                  <Image
                    src={image.url}
                    alt="Foto da sala"
                    className="h-32 w-full rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <IconTrash size={16} />
                  </Button>
                </div>
              ))}
              {internalRoom.images?.length === 0 && (
                <p className="col-span-full text-sm text-gray-500">
                  Esta sala ainda não tem fotos.
                </p>
              )}
            </div>
            <ImageUploader onUploadSuccess={handleAddImage} />
          </div>
        )}
      </div>
    </div>
  );
}
