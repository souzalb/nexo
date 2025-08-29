'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// Schema e Tipo para o formulário de criação
const userCreateSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório'),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.nativeEnum(Role),
});
type UserCreateFormData = z.infer<typeof userCreateSchema>;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { role: Role.TEACHER },
  });

  const handleAddSubmit = async (formData: UserCreateFormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      toast.success('Usuário criado com sucesso!');
      reset();
      onSuccess(); // Chama a função de sucesso (refresh) do pai
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-8">
        <h2 className="mb-4 text-xl font-bold">Adicionar Novo Usuário</h2>
        <form onSubmit={handleSubmit(handleAddSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="add-name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome
            </label>
            <Input id="add-name" {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="add-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <Input id="add-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="add-password"
              className="block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <Input
              id="add-password"
              type="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="add-role"
              className="block text-sm font-medium text-gray-700"
            >
              Permissão
            </label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma permissão" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Role).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
