'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Resource } from '@prisma/client';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { IconEdit, IconTrash } from '@tabler/icons-react';

const resourceSchema = z.object({
  name: z.string().min(2, 'O nome do recurso é obrigatório'),
});
type FormData = z.infer<typeof resourceSchema>;

interface ResourcesManagerProps {
  initialResources: Resource[];
}

export function ResourcesManager({ initialResources }: ResourcesManagerProps) {
  const router = useRouter();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );

  // Formulário para Adicionar Recurso
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd, isSubmitting: isSubmittingAdd },
  } = useForm<FormData>({
    resolver: zodResolver(resourceSchema),
  });

  // Formulário para Editar Recurso
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<FormData>({
    resolver: zodResolver(resourceSchema),
  });

  // Efeito para preencher o formulário de edição quando um recurso é selecionado
  useEffect(() => {
    if (selectedResource) {
      setValue('name', selectedResource.name);
    }
  }, [selectedResource, setValue]);

  const handleAddResource = async (data: FormData) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao adicionar recurso');
      }
      toast.success('Recurso adicionado com sucesso!');
      resetAdd();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleOpenEditModal = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedResource(null);
    resetEdit();
  };

  const handleEditSubmit = async (data: FormData) => {
    if (!selectedResource) return;
    try {
      const response = await fetch(`/api/resources/${selectedResource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar o recurso.');
      }
      toast.success('Recurso atualizado com sucesso!');
      handleCloseEditModal();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = (resource: Resource) => {
    toast.error(
      `Tem certeza que deseja excluir o recurso "${resource.name}"?`,
      {
        action: {
          label: 'Confirmar Exclusão',
          onClick: async () => {
            try {
              const response = await fetch(`/api/resources/${resource.id}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
              }
              toast.success('Recurso excluído com sucesso!');
              router.refresh();
            } catch (error) {
              toast.error((error as Error).message);
            }
          },
        },
        cancel: { label: 'Cancelar', onClick: () => {} },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 shadow-sm">
        <form
          onSubmit={handleSubmitAdd(handleAddResource)}
          className="flex items-start gap-4"
        >
          <div className="flex-grow">
            <label htmlFor="add-name" className="sr-only">
              Nome do Recurso
            </label>
            <Input
              id="add-name"
              placeholder="Nome do novo recurso..."
              {...registerAdd('name')}
            />
            {errorsAdd.name && (
              <p className="mt-1 text-xs text-red-600">
                {errorsAdd.name.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmittingAdd}>
            {isSubmittingAdd ? 'A adicionar...' : 'Adicionar Recurso'}
          </Button>
        </form>
      </div>
      <div className="rounded-lg border shadow-sm">
        <ul className="divide-y">
          {initialResources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center justify-between p-4"
            >
              <span className="text-sm font-medium">{resource.name}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEditModal(resource)}
                >
                  <IconEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(resource)}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {initialResources.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500">
              Nenhum recurso cadastrado.
            </li>
          )}
        </ul>
      </div>

      {/* Modal de Edição de Recurso */}
      {isEditModalOpen && selectedResource && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-lg rounded-lg bg-white p-8">
            <h2 className="mb-6 text-xl font-bold">Editar Recurso</h2>
            <form
              onSubmit={handleSubmitEdit(handleEditSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="edit-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nome do Recurso
                </label>
                <Input id="edit-name" {...registerEdit('name')} />
                {errorsEdit.name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errorsEdit.name.message}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditModal}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? 'A salvar...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
