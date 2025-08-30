'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room } from '@prisma/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Supondo que tem estes componentes (shadcn/ui)
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

interface RecurringBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
}

const weekdaysData = [
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

const recurringBookingSchema = z
  .object({
    roomId: z.string().min(1, 'A sala é obrigatória'),
    classCode: z.string().min(1, 'O código da turma é obrigatório'),
    period: z.enum(['MANHA', 'TARDE', 'NOITE'], {
      message: 'O período é obrigatório',
    }),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Data de início inválida',
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Data de término inválida',
    }),
    weekdays: z
      .array(z.number())
      .min(1, 'Selecione pelo menos um dia da semana'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'A data de término não pode ser anterior à data de início',
    path: ['endDate'],
  });

type RecurringBookingFormData = z.infer<typeof recurringBookingSchema>;

export function RecurringBookingModal({
  isOpen,
  onClose,
  rooms,
}: RecurringBookingModalProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringBookingFormData>({
    resolver: zodResolver(recurringBookingSchema),
    defaultValues: {
      weekdays: [],
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: RecurringBookingFormData) => {
    try {
      const response = await fetch('/api/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Falha ao criar reservas');
      }

      toast.success(responseData.message);
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8">
        <h2 className="mb-6 text-xl font-bold">Criar Reserva Recorrente</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="classCode"
                className="block text-sm font-medium text-gray-700"
              >
                Código da Turma
              </label>
              <Input id="classCode" {...register('classCode')} />
              {errors.classCode && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.classCode.message}
                </p>
              )}
            </div>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala" />
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
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANHA">Manhã (07:30 - 11:30)</SelectItem>
                    <SelectItem value="TARDE">Tarde (13:00 - 17:00)</SelectItem>
                    <SelectItem value="NOITE">Noite (18:30 - 22:30)</SelectItem>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Controller
                name="weekdays"
                control={control}
                render={({ field }) => (
                  <>
                    {weekdaysData.map((day) => (
                      <div key={day.id} className="flex items-center">
                        <Checkbox
                          id={`day-${day.id}`}
                          checked={field.value?.includes(day.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...field.value, day.id]
                              : field.value?.filter((id) => id !== day.id);
                            field.onChange(newValue);
                          }}
                        />
                        <label
                          htmlFor={`day-${day.id}`}
                          className="ml-2 text-sm"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </>
                )}
              />
            </div>
            {errors.weekdays && (
              <p className="mt-1 text-xs text-red-600">
                {errors.weekdays.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A criar...' : 'Criar Reservas'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
