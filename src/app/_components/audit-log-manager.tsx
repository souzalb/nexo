'use client';

import { useState, useEffect } from 'react';
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

// Tipos para os dados da API
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

export function AuditLogManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/audit-logs?page=${currentPage}`);
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
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && pagination && newPage <= pagination.pageCount) {
      setCurrentPage(newPage);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
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
                    Nenhum log de auditoria encontrado.
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pageCount}
            >
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
