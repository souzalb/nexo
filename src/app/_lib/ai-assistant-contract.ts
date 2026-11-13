import { z } from 'zod';

export const slotLabels = {
  MANHA_PRIMEIRO: 'Manhã · 07h30–09h30',
  MANHA_SEGUNDO: 'Manhã · 09h30–11h30',
  MANHA_INTEIRO: 'Manhã · 07h30–11h30',
  TARDE_PRIMEIRO: 'Tarde · 13h–15h',
  TARDE_SEGUNDO: 'Tarde · 15h–17h',
  TARDE_INTEIRO: 'Tarde · 13h–17h',
  NOITE_PRIMEIRO: 'Noite · 18h30–20h',
  NOITE_SEGUNDO: 'Noite · 20h–22h30',
  NOITE_INTEIRO: 'Noite · 18h30–22h30',
} as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Informe uma data válida.');
export const availabilitySchema = z
  .object({
    room_id: z.string().min(1).max(100),
    start_date: date,
    end_date: date,
    time_slots: z
      .array(
        z.enum(
          Object.keys(slotLabels) as [
            keyof typeof slotLabels,
            ...(keyof typeof slotLabels)[],
          ],
        ),
      )
      .min(1)
      .max(6),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  })
  .superRefine((value, ctx) => {
    const interval = Date.parse(value.end_date) - Date.parse(value.start_date);
    if (interval < 0 || interval > 366 * 86400000)
      ctx.addIssue({
        code: 'custom',
        message:
          'Use um intervalo de até 366 dias, com fim igual ou posterior ao início.',
      });
    if (
      new Set(value.time_slots).size !== value.time_slots.length ||
      ['MANHA', 'TARDE', 'NOITE'].some(
        (period) =>
          value.time_slots.includes(
            `${period}_INTEIRO` as keyof typeof slotLabels,
          ) &&
          value.time_slots.some(
            (slot) => slot.startsWith(period) && !slot.endsWith('INTEIRO'),
          ),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Os horários selecionados se sobrepõem.',
      });
  });
export const proposalSchema = availabilitySchema.safeExtend({
  class_code: z.string().trim().min(1).max(120),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});
export const chatSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(12000),
        }),
      )
      .min(1)
      .max(40),
  })
  .refine(
    (body) =>
      body.messages.at(-1)?.role === 'user' &&
      body.messages.reduce((sum, msg) => sum + msg.content.length, 0) <= 60000,
    'Conversa muito longa ou mensagem inválida. Inicie uma nova conversa.',
  );
export const roomSearchSchema = z
  .object({
    localizacao: z.string().trim().max(100).optional(),
    start_date: date.optional(),
    end_date: date.optional(),
    time_slots: availabilitySchema.shape.time_slots.optional(),
    weekdays: availabilitySchema.shape.weekdays,
    mostrar_alternativas: z.boolean().optional().default(false),
    excluir_salas: z.array(z.string().min(1).max(100)).max(100).optional(),
    nome: z.string().max(100).optional(),
    tipo: z.string().max(100).optional(),
    capacidade_minima: z.number().int().positive().max(10000).optional(),
    alunos: z.number().int().positive().max(10000).optional(),
    recursos: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.start_date ||
      value.end_date ||
      value.time_slots ||
      value.weekdays
    ) {
      if (
        !availabilitySchema.safeParse({ ...value, room_id: 'search' }).success
      )
        ctx.addIssue({
          code: 'custom',
          message:
            'Para filtrar disponibilidade, informe data inicial, final e horários válidos.',
        });
    }
  });
export type AssistantProposal = z.infer<typeof proposalSchema> & {
  roomName: string;
};
export type AssistantRoom = {
  id: string;
  name: string;
  capacity: number;
  type: string;
  location: string | null;
  resources: { name: string }[];
  recommendation?: { score: number; reasons: string[] };
};
export function schoolToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
