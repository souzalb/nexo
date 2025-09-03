'use client';

import { useRouter } from 'next/navigation';
import { Resource } from '@prisma/client';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { Input } from './ui/input';

const resourceSchema = z.object({
  name: z.string().min(2, 'O nome do recurso é obrigatório'),
});
type FormData = z.infer<typeof resourceSchema>;

interface ResourcesManagerProps {
  initialResources: Resource[];
}

export function ResourcesManager({ initialResources }: ResourcesManagerProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(resourceSchema),
  });

  const handleAddResource = async (data: FormData) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Tenta obter uma mensagem de erro específica da API
        try {
          const errorData = await response.json();
          // O Prisma pode enviar o erro num formato diferente
          const errorMessage =
            errorData.message ||
            (errorData.errors && errorData.errors[0].message) ||
            'Falha ao adicionar recurso';
          throw new Error(errorMessage);
        } catch (jsonError) {
          // Se a API não retornar um JSON válido, lança o erro genérico
          console.log('Erro ao adicionar recurso:', jsonError);
          throw new Error(
            `Falha ao adicionar recurso com status: ${response.status}`,
          );
        }
      }

      toast.success('Recurso adicionado com sucesso!');
      reset();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <form
          onSubmit={handleSubmit(handleAddResource)}
          className="flex items-start gap-4"
        >
          <div className="flex-grow">
            <label htmlFor="name" className="sr-only">
              Nome do Recurso
            </label>
            <Input
              id="name"
              placeholder="Nome do novo recurso..."
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A adicionar...' : 'Adicionar Recurso'}
          </Button>
        </form>
      </div>
      <div className="rounded-lg border bg-white shadow-sm">
        <ul className="divide-y">
          {initialResources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center justify-between p-4"
            >
              <span className="text-sm font-medium">{resource.name}</span>
              {/* Botões de Editar/Excluir podem ser adicionados aqui no futuro */}
            </li>
          ))}
          {initialResources.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500">
              Nenhum recurso cadastrado.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
