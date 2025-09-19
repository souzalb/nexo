'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { User } from '@prisma/client';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { IconFilter, IconFilterX } from '@tabler/icons-react';

type AuditLog = {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
};

type Pagination = {
  total: number;
  pageCount: number;
  currentPage: number;
  limit: number;
};

type Filters = {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
};

interface AuditLogManagerProps {
  allUsers: Pick<User, 'id' | 'name'>[];
}

export function AuditLogManager({ allUsers }: AuditLogManagerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Filters>({});

  const { register, handleSubmit, control, reset } = useForm<Filters>();

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        if (activeFilters.userId && activeFilters.userId !== 'all')
          params.append('userId', activeFilters.userId);
        if (activeFilters.action) params.append('action', activeFilters.action);
        if (activeFilters.startDate)
          params.append('startDate', activeFilters.startDate);
        if (activeFilters.endDate)
          params.append('endDate', activeFilters.endDate);

        const response = await fetch(`/api/audit-logs?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar os logs.');
        }
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [currentPage, activeFilters]);

  const handleFilterSubmit = (filters: Filters) => {
    setCurrentPage(1); // Volta para a primeira página ao aplicar novos filtros
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    reset({ userId: 'all', action: '', startDate: '', endDate: '' });
    setActiveFilters({});
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-between gap-4 px-4 lg:flex-row">
          <h3 className="hidden w-fit text-sm font-semibold text-gray-700 sm:block dark:text-gray-100">
            Filtros:
          </h3>
          <form
            onSubmit={handleSubmit(handleFilterSubmit)}
            className="flex w-full flex-col items-center gap-4 lg:flex-row"
          >
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || 'all'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por Utilizador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Utilizadores</SelectItem>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              placeholder="Filtrar por Ação (ex: CREATE_ROOM)"
              {...register('action')}
            />
            <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
              Data de início:
            </h3>
            <Input type="date" {...register('startDate')} />
            <h3 className="hidden text-sm text-nowrap text-gray-700 sm:block dark:text-gray-100">
              Data de término:
            </h3>
            <Input type="date" {...register('endDate')} />
            <div className="flex w-full items-center gap-2">
              <Button type="submit" className="flex-1">
                <IconFilter className="mr-2 h-4 w-4" />
                Aplicar
              </Button>
              <Button
                variant="secondary"
                onClick={clearFilters}
                className="text-red-500 hover:bg-red-50 hover:text-red-600 sm:mt-0"
              >
                <IconFilterX />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="p-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Realizada Por</TableHead>
                  <TableHead>Data e Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {log.action}
                      </TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell>
                        {log.user.name}{' '}
                        <span className="text-muted-foreground">
                          ({log.user.email})
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-sm text-gray-500"
                    >
                      Nenhum log encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-end space-x-2 border-t p-4">
              <span className="text-muted-foreground text-sm">
                Página {pagination.currentPage} de {pagination.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pageCount}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
