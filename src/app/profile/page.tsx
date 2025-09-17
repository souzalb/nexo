'use client';

import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useEffect } from 'react';
import { Input } from '../_components/ui/input';
import { Button } from '../_components/ui/button';
import { SidebarInset, SidebarProvider } from '../_components/ui/sidebar';
import { AppSidebar } from '../_components/app-sidebar';
import { SiteHeader } from '../_components/site-header';

// Schema para o formulário de perfil
const profileSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
});
type ProfileFormData = z.infer<typeof profileSchema>;

// Schema para o formulário de senha
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  // Formulário para dados do perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Formulário para mudança de senha
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Efeito para popular o formulário de perfil com os dados da sessão
  useEffect(() => {
    if (session?.user) {
      resetProfile({
        name: session.user.name ?? '',
        email: session.user.email ?? '',
      });
    }
  }, [session, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      // Atualiza a sessão do NextAuth para refletir as mudanças no nome/email
      await updateSession({ name: data.name, email: data.email });
      console.log('Perfil atualizado:', data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      toast.success('Senha atualizada com sucesso!');
      resetPassword();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="container mx-auto space-y-8 p-4 md:p-8">
          {/* Formulário de Perfil */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">Dados do Perfil</h2>
            <form
              onSubmit={handleSubmitProfile(onProfileSubmit)}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium">
                  Nome
                </label>
                <Input id="name" {...registerProfile('name')} />
                {profileErrors.name && (
                  <p className="mt-1 text-xs text-red-600">
                    {profileErrors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <Input id="email" type="email" {...registerProfile('email')} />
                {profileErrors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {profileErrors.email.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingProfile}>
                  {isSubmittingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>

          {/* Formulário de Senha */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">Alterar Senha</h2>
            <form
              onSubmit={handleSubmitPassword(onPasswordSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium"
                >
                  Senha Atual
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium"
                >
                  Nova Senha
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingPassword}>
                  {isSubmittingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
