'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  IconAlertTriangle,
  IconTrash,
  IconCalendar,
  IconFileText,
  IconBell,
  IconHistory,
  IconDatabaseOff,
  IconLoader2,
  IconShieldCheck,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';

type DataStats = {
  bookings: { total: number; past: number; future: number };
  bookingRequests: { total: number; pending: number };
  notifications: number;
  auditLogs: number;
};

type CleanupTarget =
  'bookings' | 'requests' | 'notifications' | 'audit-logs' | 'all';
type CleanupScope = 'past' | 'all';

interface PendingAction {
  target: CleanupTarget;
  scope: CleanupScope;
  label: string;
  description: string;
}

export function DataLibraryManager() {
  const router = useRouter();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [confirmText, setConfirmText] = useState('');

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data-library');
      if (!response.ok) throw new Error('Falha ao buscar estatísticas.');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleConfirmDelete = async () => {
    if (!pendingAction || confirmText !== 'CONFIRMAR') return;
    setIsDeleting(true);
    try {
      const response = await fetch('/api/data-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: pendingAction.target,
          scope: pendingAction.scope,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      toast.success(data.message);
      setPendingAction(null);
      setConfirmText('');
      fetchStats();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openConfirmation = (
    target: CleanupTarget,
    scope: CleanupScope,
    label: string,
    description: string,
  ) => {
    setPendingAction({ target, scope, label, description });
    setConfirmText('');
  };

  const StatValue = ({
    value,
    loading,
  }: {
    value: number;
    loading: boolean;
  }) =>
    loading ? (
      <span className="text-muted-foreground animate-pulse">...</span>
    ) : (
      <span className="text-3xl font-bold">
        {value.toLocaleString('pt-BR')}
      </span>
    );

  return (
    <>
      {/* --- BANNER DE AVISO --- */}
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
        <IconAlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <h3 className="font-semibold text-red-800 dark:text-red-300">
            Zona Perigosa — Gestão de Dados
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            As ações nesta página são <strong>irreversíveis</strong>. A exclusão
            de dados não pode ser desfeita. Utilize esta ferramenta com extremo
            cuidado para manter o sistema otimizado.
          </p>
        </div>
      </div>

      {/* --- CARDS DE ESTATÍSTICAS --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reservas</CardTitle>
            <IconCalendar className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <StatValue value={stats?.bookings.total ?? 0} loading={isLoading} />
            <p className="text-muted-foreground mt-1 text-xs">
              {stats?.bookings.past ?? 0} passadas ·{' '}
              {stats?.bookings.future ?? 0} futuras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Solicitações</CardTitle>
            <IconFileText className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <StatValue
              value={stats?.bookingRequests.total ?? 0}
              loading={isLoading}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {stats?.bookingRequests.pending ?? 0} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <IconBell className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <StatValue value={stats?.notifications ?? 0} loading={isLoading} />
            <p className="text-muted-foreground mt-1 text-xs">
              Total no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Logs de Auditoria
            </CardTitle>
            <IconHistory className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <StatValue value={stats?.auditLogs ?? 0} loading={isLoading} />
            <p className="text-muted-foreground mt-1 text-xs">
              Total de registros
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- AÇÕES DE LIMPEZA --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ações de Limpeza</h2>

        {/* Reservas passadas */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Excluir Reservas Passadas
                </CardTitle>
                <CardDescription>
                  Remove todas as reservas cuja data de término já passou. As
                  reservas futuras serão mantidas.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() =>
                  openConfirmation(
                    'bookings',
                    'past',
                    'Excluir Reservas Passadas',
                    `Serão excluídas ${stats?.bookings.past ?? 0} reservas passadas. Reservas futuras não serão afetadas.`,
                  )
                }
                disabled={!stats?.bookings.past}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Solicitações processadas */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Excluir Solicitações Processadas
                </CardTitle>
                <CardDescription>
                  Remove solicitações de reserva já aprovadas ou recusadas.
                  Solicitações pendentes serão mantidas.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() =>
                  openConfirmation(
                    'requests',
                    'past',
                    'Excluir Solicitações Processadas',
                    `Serão excluídas as solicitações já aprovadas ou recusadas. As ${stats?.bookingRequests.pending ?? 0} solicitações pendentes serão mantidas.`,
                  )
                }
                disabled={
                  (stats?.bookingRequests.total ?? 0) -
                    (stats?.bookingRequests.pending ?? 0) ===
                  0
                }
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Notificações lidas */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Excluir Notificações Lidas
                </CardTitle>
                <CardDescription>
                  Remove todas as notificações já lidas pelos utilizadores. As
                  notificações não lidas serão mantidas.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() =>
                  openConfirmation(
                    'notifications',
                    'past',
                    'Excluir Notificações Lidas',
                    'Serão excluídas todas as notificações já marcadas como lidas.',
                  )
                }
                disabled={!stats?.notifications}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Logs de auditoria */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Excluir Logs de Auditoria
                </CardTitle>
                <CardDescription>
                  Remove todos os registos de auditoria do sistema. Um novo
                  registo será criado para documentar esta ação.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() =>
                  openConfirmation(
                    'audit-logs',
                    'all',
                    'Excluir Logs de Auditoria',
                    `Serão excluídos ${stats?.auditLogs ?? 0} registos de auditoria.`,
                  )
                }
                disabled={!stats?.auditLogs}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* --- ZONA DE DESTRUIÇÃO TOTAL --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
          Exclusão Total
        </h2>

        <Card className="border-2 border-red-300 dark:border-red-800">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                  <IconDatabaseOff className="h-5 w-5" />
                  Excluir TODAS as Reservas
                </CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/60">
                  Remove <strong>todas</strong> as reservas do sistema —
                  passadas e futuras. Esta ação é completamente irreversível e
                  irá zerar o calendário.
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                className="shrink-0"
                onClick={() =>
                  openConfirmation(
                    'bookings',
                    'all',
                    'EXCLUIR TODAS AS RESERVAS',
                    `⚠️ ATENÇÃO: Serão excluídas TODAS as ${stats?.bookings.total ?? 0} reservas do sistema, incluindo as ${stats?.bookings.future ?? 0} reservas futuras. O calendário será completamente zerado.`,
                  )
                }
                disabled={!stats?.bookings.total}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Excluir Tudo
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2 border-red-300 dark:border-red-800">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                  <IconDatabaseOff className="h-5 w-5" />
                  Reset Completo do Sistema
                </CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/60">
                  Remove <strong>todos</strong> os dados transacionais:
                  reservas, solicitações, notificações e logs de auditoria.
                  Salas, recursos e utilizadores não serão afetados.
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                className="shrink-0"
                onClick={() =>
                  openConfirmation(
                    'all',
                    'all',
                    'RESET COMPLETO DO SISTEMA',
                    `⚠️ OPERAÇÃO EXTREMAMENTE PERIGOSA: Serão excluídos TODOS os dados transacionais — ${stats?.bookings.total ?? 0} reservas, ${stats?.bookingRequests.total ?? 0} solicitações, ${stats?.notifications ?? 0} notificações e ${stats?.auditLogs ?? 0} logs. Apenas salas, recursos e utilizadores serão mantidos.`,
                  )
                }
                disabled={
                  !stats?.bookings.total &&
                  !stats?.bookingRequests.total &&
                  !stats?.notifications &&
                  !stats?.auditLogs
                }
              >
                <IconDatabaseOff className="mr-2 h-4 w-4" />
                Reset Completo
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingAction(null);
            setConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <IconAlertTriangle className="h-5 w-5" />
              {pendingAction?.label}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {pendingAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Esta ação é irreversível. Os dados excluídos não poderão ser
                recuperados.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Digite{' '}
                <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-red-700 dark:bg-red-900 dark:text-red-300">
                  CONFIRMAR
                </span>{' '}
                para prosseguir:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="border-red-300 font-mono focus-visible:ring-red-500 dark:border-red-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingAction(null);
                setConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={confirmText !== 'CONFIRMAR' || isDeleting}
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <IconShieldCheck className="mr-2 h-4 w-4" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
