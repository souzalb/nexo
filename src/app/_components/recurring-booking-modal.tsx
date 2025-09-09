'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room, User } from '@prisma/client';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';

// Schema de validação para o formulário
const schema = z
  .object({
    roomId: z.string().min(1, 'Por favor, selecione uma sala.'),
    classCode: z.string().min(1, 'O código da turma é obrigatório.'),
    period: z.enum(['MANHA', 'TARDE', 'NOITE'], {
      message: 'Por favor, selecione um período.',
    }),
    startDate: z.string().min(1, 'A data de início é obrigatória.'),
    endDate: z.string().min(1, 'A data de término é obrigatória.'),
    weekdays: z
      .array(z.number())
      .min(1, 'Selecione pelo menos um dia da semana.'),
    userId: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'A data de término não pode ser anterior à data de início.',
    path: ['endDate'],
  });

type FormData = z.infer<typeof schema>;

const weekdaysOptions = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
];

interface RecurringBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  users: Pick<User, 'id' | 'name'>[];
}

export function RecurringBookingModal({
  isOpen,
  onClose,
  rooms,
  users,
}: RecurringBookingModalProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      weekdays: [],
      classCode: '',
      startDate: '',
      endDate: '',
    },
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Falha ao criar reservas.');
      }
      toast.success(responseData.message);
      reset();
      onClose();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-8">
        <h2 className="mb-6 text-xl font-bold">Criar Reserva</h2>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {session?.user.role === 'ADMIN' && (
            <div>
              <label
                htmlFor="userId"
                className="block text-sm font-medium text-gray-700"
              >
                Reservar para o Usuário
              </label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um utilizador (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Se nenhum utilizador for selecionado, a reserva será atribuída a
                si.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="classCode"
              className="block text-sm font-medium text-gray-700"
            >
              Título / Código da Turma
            </label>
            <Input id="classCode" {...register('classCode')} />
            {errors.classCode && (
              <p className="mt-1 text-xs text-red-600">
                {errors.classCode.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="roomId"
                className="block text-sm font-medium text-gray-700"
              >
                Sala
              </label>
              <Controller
                name="roomId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roomId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.roomId.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="period"
                className="block text-sm font-medium text-gray-700"
              >
                Período
              </label>
              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANHA">Manhã</SelectItem>
                      <SelectItem value="TARDE">Tarde</SelectItem>
                      <SelectItem value="NOITE">Noite</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.period && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.period.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data de Início
              </label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data de Término
              </label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dias da Semana
            </label>

            <Controller
              name="weekdays"
              control={control}
              render={({ field }) => (
                <div className="mt-2 grid grid-cols-3 gap-4">
                  {weekdaysOptions.map((day) => (
                    <div key={day.id} className="flex items-center">
                      <Checkbox
                        id={`weekday-${day.id}`}
                        checked={field.value?.includes(day.id)}
                        onCheckedChange={(checked) => {
                          const currentWeekdays = field.value || [];
                          if (checked) {
                            field.onChange([...currentWeekdays, day.id]);
                          } else {
                            field.onChange(
                              currentWeekdays.filter(
                                (value) => value !== day.id,
                              ),
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`weekday-${day.id}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.weekdays && (
              <p className="mt-1 text-xs text-red-600">
                {errors.weekdays.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A criar reservas...' : 'Criar Reservas'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
