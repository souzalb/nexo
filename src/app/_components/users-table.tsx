'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  RowData,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User as PrismaUser, Role } from '@prisma/client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Supondo que você tenha esses componentes shadcn/ui
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  IconCopy,
  IconEdit,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';

export type User = Omit<PrismaUser, 'password' | 'updatedAt'>;

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    openEditModal: (user: User) => void;
  }
}
// eslint-disable-next-line
function ActionsCell({ user, table }: { user: User; table: any }) {
  const router = useRouter();

  const handleDelete = async () => {
    toast.error(`Tem certeza que deseja excluir o usuário "${user.name}"?`, {
      action: {
        label: 'Confirmar Exclusão',
        onClick: async () => {
          try {
            const response = await fetch(`/api/users/${user.id}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message);
            }
            toast.success('Usuário excluído com sucesso!');
            router.refresh();
          } catch (error) {
            toast.error((error as Error).message);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  return (
    <div className="flex justify-end gap-2">
      <Button
        onClick={() => navigator.clipboard.writeText(user.id)}
        className="bg-gray-400 hover:bg-gray-300"
      >
        <IconCopy />
      </Button>

      <Button
        onClick={() => table.options.meta?.openEditModal(user)}
        className="bg-orange-500 hover:bg-orange-400"
      >
        <IconEdit />
      </Button>

      <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
        <IconTrash />
      </Button>
    </div>
  );
}

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nome
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="lowercase">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'role',
    header: 'Permissão',
    cell: ({ row }) => (
      <div className="capitalize">
        {String(row.getValue('role')).toLowerCase()}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Data de Criação',
    cell: ({ row }) => (
      <div>
        {new Date(row.getValue('createdAt')).toLocaleDateString('pt-BR')}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, table }) => <ActionsCell user={row.original} table={table} />,
    enableHiding: false,
  },
];

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

const userEditSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.email('Email inválido'),
  role: z.nativeEnum(Role),
});
type UserEditFormData = z.infer<typeof userEditSchema>;

export function UsersTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
  });

  React.useEffect(() => {
    if (selectedUser) {
      setValue('name', selectedUser.name || '');
      setValue('email', selectedUser.email || '');
      setValue('role', selectedUser.role);
    }
  }, [selectedUser, setValue]);

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    reset();
  };

  const handleEditSubmit = async (formData: UserEditFormData) => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      toast.success('Usuário atualizado com sucesso!');
      handleCloseEditModal();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    meta: {
      openEditModal: (user) => {
        setSelectedUser(user as User);
        setIsEditModalOpen(true);
      },
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Colunas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-blue-600 hover:bg-blue-500">
            <IconUserPlus />
            Adicionar Usuário
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próximo
          </Button>
        </div>
      </div>

      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-secondary w-full max-w-lg rounded-lg p-8">
            <h2 className="mb-4 text-xl font-bold">Editar Usuário</h2>
            <form
              onSubmit={handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nome
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
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="role"
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
                  <p className="mt-1 text-xs text-red-600">
                    {errors.role.message}
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
