'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room, User } from '@prisma/client';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import * as React from 'react';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const apiTimeSlotsEnum = z.enum([
  'MANHA_PRIMEIRO',
  'MANHA_SEGUNDO',
  'MANHA_INTEIRO',
  'TARDE_PRIMEIRO',
  'TARDE_SEGUNDO',
  'TARDE_INTEIRO',
  'NOITE_PRIMEIRO',
  'NOITE_SEGUNDO',
  'NOITE_INTEIRO',
]);
type ApiTimeSlot = z.infer<typeof apiTimeSlotsEnum>;

// O enum que a UI usa (apenas meios-períodos)
const uiTimeSlotsEnum = z.enum([
  'MANHA_PRIMEIRO',
  'MANHA_SEGUNDO',
  'TARDE_PRIMEIRO',
  'TARDE_SEGUNDO',
  'NOITE_PRIMEIRO',
  'NOITE_SEGUNDO',
]);
type UiTimeSlot = z.infer<typeof uiTimeSlotsEnum>;

// Schema para validar o formulário na UI
const schema = z
  .object({
    roomId: z.string().min(1, 'Por favor, selecione uma sala.'),
    classCode: z.string().min(1, 'O código da turma é obrigatório.'),
    timeSlots: z
      .array(uiTimeSlotsEnum)
      .min(1, 'Selecione pelo menos um horário.'),
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

// Opções para os formulários
const weekdaysOptions = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
];

const periodOptions: {
  value: 'MANHA' | 'TARDE' | 'NOITE';
  label: string;
  slots: { id: UiTimeSlot; label: string }[];
}[] = [
  {
    value: 'MANHA',
    label: 'Manhã',
    slots: [
      { id: 'MANHA_PRIMEIRO', label: '1º Horário (07:30 - 09:30)' },
      { id: 'MANHA_SEGUNDO', label: '2º Horário (09:30 - 11:30)' },
    ],
  },
  {
    value: 'TARDE',
    label: 'Tarde',
    slots: [
      { id: 'TARDE_PRIMEIRO', label: '1º Horário (13:00 - 15:00)' },
      { id: 'TARDE_SEGUNDO', label: '2º Horário (15:00 - 17:00)' },
    ],
  },
  {
    value: 'NOITE',
    label: 'Noite',
    slots: [
      { id: 'NOITE_PRIMEIRO', label: '1º Horário (18:30 - 20:00)' },
      { id: 'NOITE_SEGUNDO', label: '2º Horário (20:00 - 21:30)' },
    ],
  },
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

  const [selectedPeriod, setSelectedPeriod] = React.useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { weekdays: [], timeSlots: [] },
  });

  const timeSlotsValue = watch('timeSlots');

  const handleFullPeriodChange = (
    checked: boolean,
    period: 'MANHA' | 'TARDE' | 'NOITE',
  ) => {
    const currentSlots = timeSlotsValue || [];
    const periodSlots: UiTimeSlot[] = [
      `${period}_PRIMEIRO` as UiTimeSlot,
      `${period}_SEGUNDO` as UiTimeSlot,
    ];

    if (checked) {
      const newSlots = [...new Set([...currentSlots, ...periodSlots])];
      setValue('timeSlots', newSlots);
    } else {
      setValue(
        'timeSlots',
        currentSlots.filter((slot) => !periodSlots.includes(slot)),
      );
    }
  };

  const handleIntegralPeriodChange = (checked: boolean) => {
    const currentSlots = timeSlotsValue || [];
    const manhaSlots: UiTimeSlot[] = ['MANHA_PRIMEIRO', 'MANHA_SEGUNDO'];
    const tardeSlots: UiTimeSlot[] = ['TARDE_PRIMEIRO', 'TARDE_SEGUNDO'];
    const integralSlots = [...manhaSlots, ...tardeSlots];

    if (checked) {
      // Adiciona os horários da manhã e tarde, removendo os da noite para evitar conflito.
      const newSlots = [...new Set([...currentSlots, ...integralSlots])].filter(
        (slot) => !slot.startsWith('NOITE'),
      );
      setValue('timeSlots', newSlots);
    } else {
      // Remove os horários da manhã e tarde.
      setValue(
        'timeSlots',
        currentSlots.filter((slot) => !integralSlots.includes(slot)),
      );
    }
  };

  const isIntegralSelected = [
    'MANHA_PRIMEIRO',
    'MANHA_SEGUNDO',
    'TARDE_PRIMEIRO',
    'TARDE_SEGUNDO',
  ].every((slot) => timeSlotsValue?.includes(slot as UiTimeSlot));

  const handleFormSubmit = async (data: FormData) => {
    const isRequest = session?.user.role !== 'ADMIN';
    const url = isRequest ? '/api/booking-requests' : '/api/bookings/';

    const processedSlots = new Set<ApiTimeSlot>();
    const periods: ('MANHA' | 'TARDE' | 'NOITE')[] = [
      'MANHA',
      'TARDE',
      'NOITE',
    ];

    periods.forEach((period) => {
      const first = `${period}_PRIMEIRO` as UiTimeSlot;
      const second = `${period}_SEGUNDO` as UiTimeSlot;
      const full = `${period}_INTEIRO` as ApiTimeSlot;

      if (data.timeSlots.includes(first) && data.timeSlots.includes(second)) {
        processedSlots.add(full);
      } else {
        if (data.timeSlots.includes(first)) processedSlots.add(first);
        if (data.timeSlots.includes(second)) processedSlots.add(second);
      }
    });

    const payload = { ...data, timeSlots: Array.from(processedSlots) };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(responseData.message || 'Falha ao criar reservas.');
      toast.success(
        isRequest
          ? 'Solicitação de reserva enviada com sucesso!'
          : responseData.message,
      );

      handleClose();
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedPeriod(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-secondary w-full max-w-lg rounded-lg p-8">
        <h2 className="mb-6 text-xl font-bold">Criar Reserva</h2>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {session?.user.role === 'ADMIN' && (
            <div>
              <label
                htmlFor="userId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-100"
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
                    <SelectTrigger className="w-full">
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
            </div>
          )}

          <div>
            <label
              htmlFor="classCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-100"
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

          <div>
            <label
              htmlFor="roomId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-100"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">
              Período e Horários
            </label>

            <Select
              onValueChange={(value) => setSelectedPeriod(value)}
              value={selectedPeriod || ''}
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Selecione um período para ver os horários" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-2 flex items-center space-x-2 rounded-md border p-2">
              <Checkbox
                id="INTEGRAL_PERIODO"
                checked={isIntegralSelected}
                onCheckedChange={(checked) =>
                  handleIntegralPeriodChange(Boolean(checked))
                }
              />
              <label
                htmlFor="INTEGRAL_PERIODO"
                className="text-sm text-gray-700 dark:text-gray-100"
              >
                Período Integral (Manhã + Tarde)
              </label>
            </div>
          </div>

          {selectedPeriod && (
            <Controller
              name="timeSlots"
              control={control}
              render={({ field }) => {
                const periodInfo = periodOptions.find(
                  (p) => p.value === selectedPeriod,
                )!;
                const periodSlots = periodInfo.slots.map((s) => s.id);
                const isFullPeriodSelected = periodSlots.every((s) =>
                  field.value?.includes(s),
                );

                return (
                  <div className="mt-2 space-y-2 rounded-md border p-4">
                    {periodInfo.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center">
                        <Checkbox
                          id={slot.id}
                          checked={field.value?.includes(slot.id)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            const newValues = checked
                              ? [...currentValues, slot.id]
                              : currentValues.filter((v) => v !== slot.id);
                            field.onChange(newValues);
                          }}
                        />
                        <label
                          htmlFor={slot.id}
                          className="ml-2 text-sm text-gray-700 dark:text-gray-100"
                        >
                          {slot.label}
                        </label>
                      </div>
                    ))}
                    <div className="flex items-center border-t pt-2">
                      <Checkbox
                        id={`${periodInfo.value}_INTEIRO`}
                        checked={isFullPeriodSelected}
                        onCheckedChange={(checked) =>
                          handleFullPeriodChange(
                            Boolean(checked),
                            // eslint-disable-next-line
                            periodInfo.value as any,
                          )
                        }
                      />
                      <label
                        htmlFor={`${periodInfo.value}_INTEIRO`}
                        className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-100"
                      >
                        Período Inteiro
                      </label>
                    </div>
                  </div>
                );
              }}
            />
          )}
          {errors.timeSlots && (
            <p className="mt-1 text-xs text-red-600">
              {errors.timeSlots.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-100"
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
                className="block text-sm font-medium text-gray-700 dark:text-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">
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
                        className="ml-2 text-sm text-gray-700 dark:text-gray-100"
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
              {isSubmitting ? 'A criar...' : 'Criar Reservas'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
