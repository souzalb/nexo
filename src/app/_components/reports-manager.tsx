'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room, User, Booking } from '@prisma/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader } from './ui/card';
import { IconFileExport, IconFilter } from '@tabler/icons-react';

// Tipos
type BookingWithRelations = Booking & {
  user: { name: string | null };
  room: { name: string | null };
};
const filtersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  roomId: z.string().optional(),
  classCode: z.string().optional(),
});
type FiltersFormData = z.infer<typeof filtersSchema>;

interface ReportsManagerProps {
  allUsers: Pick<User, 'id' | 'name'>[];
  allRooms: Pick<Room, 'id' | 'name'>[];
}

export function ReportsManager({ allUsers, allRooms }: ReportsManagerProps) {
  const [reportData, setReportData] = useState<BookingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, control } = useForm<FiltersFormData>({
    resolver: zodResolver(filtersSchema),
  });

  const handleGenerateReport = async (filters: FiltersFormData) => {
    setIsLoading(true);
    setReportData([]);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId && filters.userId !== 'all')
        params.append('userId', filters.userId);
      if (filters.roomId && filters.roomId !== 'all')
        params.append('roomId', filters.roomId);
      if (filters.classCode) params.append('classCode', filters.classCode);

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || 'Falha ao buscar os dados do relatório.',
        );
      }

      const data = await response.json();
      setReportData(data);
      toast.success(`${data.length} registo(s) encontrado(s).`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToCSV = () => {
    if (reportData.length === 0) {
      toast.warning('Não há dados para exportar.');
      return;
    }
    const headers = [
      'ID da Reserva',
      'Título',
      'Cód. Turma',
      'Sala',
      'Utilizador',
      'Data de Início',
      'Data de Fim',
    ];
    const rows = reportData.map(
      (b) =>
        `"${b.id}","${b.title}","${b.classCode}","${b.room.name}","${b.user.name}","${new Date(b.startTime).toLocaleString('pt-BR')}","${new Date(b.endTime).toLocaleString('pt-BR')}"`,
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio_reservas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToPDF = () => {
    if (reportData.length === 0) {
      toast.warning('Não há dados para exportar.');
      return;
    }
    const doc = new jsPDF();
    const tableColumn = [
      'Título',
      'Cód. Turma',
      'Sala',
      'Utilizador',
      'Início',
      'Fim',
    ];
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const tableRows: any[] = [];

    reportData.forEach((booking) => {
      const bookingData = [
        booking.title,
        booking.classCode,
        booking.room.name,
        booking.user.name,
        new Date(booking.startTime).toLocaleString('pt-BR'),
        new Date(booking.endTime).toLocaleString('pt-BR'),
      ];
      tableRows.push(bookingData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.text('Relatório de Reservas', 14, 15);
    doc.save('relatorio_reservas.pdf');
    toast.info('A exportação para PDF foi iniciada.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4">
          <h3 className="font-semibold">Filtros do Relatório</h3>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form
            onSubmit={handleSubmit(handleGenerateReport)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <Input
              placeholder="Data de Início"
              type="date"
              {...register('startDate')}
            />
            <Input
              placeholder="Data de Fim"
              type="date"
              {...register('endDate')}
            />
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
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
            <Controller
              name="roomId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Sala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Salas</SelectItem>
                    {allRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              placeholder="Filtrar por Cód. Turma"
              {...register('classCode')}
            />
            <div className="flex gap-2 xl:col-start-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                <IconFilter className="mr-2 h-4 w-4" />
                {isLoading ? 'A gerar...' : 'Gerar'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportToCSV}
                disabled={reportData.length === 0}
              >
                <IconFileExport className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportToPDF}
                disabled={reportData.length === 0}
              >
                <IconFileExport className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Cód. Turma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Sala
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Utilizador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Início
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Fim
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {reportData.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                      {booking.title}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {booking.classCode}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {booking.room.name}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {booking.user.name}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {new Date(booking.startTime).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {new Date(booking.endTime).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-sm text-gray-500"
                    >
                      Nenhum resultado para exibir. Por favor, gere um
                      relatório.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
