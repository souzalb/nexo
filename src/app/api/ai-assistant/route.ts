import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GoogleGenAI, Type } from '@google/genai';
import { Period } from '@prisma/client';
import { db } from '@/app/_lib/prisma';
import { authOptions } from '@/app/_lib/auth';

// --- Mapa de horários (reutilizado do sistema existente) ---
const periodTimesUTC: {
  [key: string]: {
    start: [number, number];
    end: [number, number];
    period: Period;
  };
} = {
  MANHA_PRIMEIRO: { start: [10, 30], end: [12, 30], period: 'MANHA' },
  MANHA_SEGUNDO: { start: [12, 30], end: [14, 30], period: 'MANHA' },
  MANHA_INTEIRO: { start: [10, 30], end: [14, 30], period: 'MANHA' },
  TARDE_PRIMEIRO: { start: [16, 0], end: [18, 0], period: 'TARDE' },
  TARDE_SEGUNDO: { start: [18, 0], end: [20, 0], period: 'TARDE' },
  TARDE_INTEIRO: { start: [16, 0], end: [20, 0], period: 'TARDE' },
  NOITE_PRIMEIRO: { start: [21, 30], end: [23, 0], period: 'NOITE' },
  NOITE_SEGUNDO: { start: [23, 0], end: [1, 30], period: 'NOITE' },
  NOITE_INTEIRO: { start: [21, 30], end: [1, 30], period: 'NOITE' },
};

// --- Definição das tools para o Gemini ---
const tools = [
  {
    functionDeclarations: [
      {
        name: 'listar_salas',
        description:
          'Lista todas as salas disponíveis no sistema, com seus nomes, tipos, capacidades e localizações. Use para quando o usuário quer saber quais salas existem ou quer escolher uma sala.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            nome: {
              type: Type.STRING,
              description: 'Filtro opcional pelo nome da sala (busca parcial).',
            },
            tipo: {
              type: Type.STRING,
              description:
                'Filtro opcional pelo tipo (ex: Laboratório, Sala de Aula).',
            },
            capacidade_minima: {
              type: Type.NUMBER,
              description: 'Filtro opcional pela capacidade mínima de pessoas.',
            },
          },
        },
      },
      {
        name: 'verificar_disponibilidade',
        description:
          'Verifica se uma sala específica está disponível em determinado período. Use para checar conflitos antes de criar uma reserva.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            room_id: {
              type: Type.STRING,
              description: 'O ID da sala a verificar.',
            },
            start_date: {
              type: Type.STRING,
              description: 'Data de início no formato YYYY-MM-DD.',
            },
            end_date: {
              type: Type.STRING,
              description: 'Data de término no formato YYYY-MM-DD.',
            },
            time_slots: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Lista de blocos horários a verificar. Valores possíveis: MANHA_PRIMEIRO, MANHA_SEGUNDO, MANHA_INTEIRO, TARDE_PRIMEIRO, TARDE_SEGUNDO, TARDE_INTEIRO, NOITE_PRIMEIRO, NOITE_SEGUNDO, NOITE_INTEIRO.',
            },
            weekdays: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description:
                'Dias da semana (0=Domingo, 1=Segunda, ..., 6=Sábado). Se não informado, verifica todos os dias no intervalo.',
            },
          },
          required: ['room_id', 'start_date', 'end_date', 'time_slots'],
        },
      },
      {
        name: 'criar_reserva',
        description:
          'Cria uma reserva ou solicitação de reserva no sistema. Se o usuário for ADMIN, cria a reserva diretamente. Se for TEACHER ou MANAGER, cria uma solicitação que será aprovada por um administrador. IMPORTANTE: Antes de chamar esta função, SEMPRE verifique a disponibilidade primeiro usando verificar_disponibilidade. Só chame esta função após confirmar que não há conflitos E após o usuário ter confirmado que deseja prosseguir.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            room_id: {
              type: Type.STRING,
              description: 'O ID da sala para a reserva.',
            },
            class_code: {
              type: Type.STRING,
              description:
                'O código/título da turma ou evento. O usuário deve fornecer este dado.',
            },
            start_date: {
              type: Type.STRING,
              description: 'Data de início no formato YYYY-MM-DD.',
            },
            end_date: {
              type: Type.STRING,
              description: 'Data de término no formato YYYY-MM-DD.',
            },
            time_slots: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Lista de blocos horários. Valores possíveis: MANHA_PRIMEIRO, MANHA_SEGUNDO, MANHA_INTEIRO, TARDE_PRIMEIRO, TARDE_SEGUNDO, TARDE_INTEIRO, NOITE_PRIMEIRO, NOITE_SEGUNDO, NOITE_INTEIRO.',
            },
            weekdays: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description:
                'Dias da semana (0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado).',
            },
          },
          required: [
            'room_id',
            'class_code',
            'start_date',
            'end_date',
            'time_slots',
            'weekdays',
          ],
        },
      },
    ],
  },
];

// --- Implementação das funções ---

async function listarSalas(params: {
  nome?: string;
  tipo?: string;
  capacidade_minima?: number;
}) {
  const where: Record<string, unknown> = {};
  if (params.nome) where.name = { contains: params.nome, mode: 'insensitive' };
  if (params.tipo) where.type = { contains: params.tipo, mode: 'insensitive' };
  if (params.capacidade_minima)
    where.capacity = { gte: params.capacidade_minima };

  const rooms = await db.room.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      capacity: true,
      type: true,
      location: true,
    },
  });

  return rooms;
}

async function verificarDisponibilidade(params: {
  room_id: string;
  start_date: string;
  end_date: string;
  time_slots: string[];
  weekdays?: number[];
}) {
  const { room_id, start_date, end_date, time_slots, weekdays } = params;

  // Gera todos os blocos de horário a verificar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeSlotsToCheck: any[] = [];
  const currentDate = new Date(start_date);
  const finalDate = new Date(end_date);

  while (currentDate <= finalDate) {
    const shouldCheck =
      !weekdays ||
      weekdays.length === 0 ||
      weekdays.includes(currentDate.getUTCDay());

    if (shouldCheck) {
      for (const slot of time_slots) {
        const times = periodTimesUTC[slot];
        if (times) {
          const startTime = new Date(currentDate);
          startTime.setUTCHours(times.start[0], times.start[1], 0, 0);
          const endTime = new Date(currentDate);
          endTime.setUTCHours(times.end[0], times.end[1], 0, 0);
          if (endTime < startTime) {
            endTime.setUTCDate(endTime.getUTCDate() + 1);
          }
          timeSlotsToCheck.push({ startTime, endTime });
        }
      }
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  if (timeSlotsToCheck.length === 0) {
    return {
      available: false,
      message:
        'Nenhum bloco de horário válido encontrado para os dias selecionados.',
      conflicts: [],
    };
  }

  const conflicts = await db.booking.findMany({
    where: {
      roomId: room_id,
      OR: timeSlotsToCheck.map((slot: { startTime: Date; endTime: Date }) => ({
        AND: [
          { startTime: { lt: slot.endTime } },
          { endTime: { gt: slot.startTime } },
        ],
      })),
    },
    include: {
      room: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 10,
  });

  return {
    available: conflicts.length === 0,
    total_slots: timeSlotsToCheck.length,
    message:
      conflicts.length === 0
        ? `A sala está disponível para ${timeSlotsToCheck.length} blocos no período solicitado.`
        : `Encontrado(s) ${conflicts.length} conflito(s) de horário.`,
    conflicts: conflicts.map((c) => ({
      date: c.startTime.toISOString().split('T')[0],
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
      title: c.title,
      userName: c.user.name,
    })),
  };
}

async function criarReserva(
  params: {
    room_id: string;
    class_code: string;
    start_date: string;
    end_date: string;
    time_slots: string[];
    weekdays: number[];
  },
  userId: string,
  userRole: string,
) {
  const { room_id, class_code, start_date, end_date, time_slots, weekdays } =
    params;
  const isAdmin = userRole === 'ADMIN';

  if (isAdmin) {
    // Criar reservas diretamente (mesma lógica da API de bookings)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingsToCreate: any[] = [];
    const bookingGroupId = crypto.randomUUID();
    const user = await db.user.findUnique({ where: { id: userId } });
    const title = `${class_code} - ${user?.name || 'Sem Nome'}`;
    const currentDate = new Date(start_date);
    const finalDate = new Date(end_date);

    while (currentDate <= finalDate) {
      if (weekdays.includes(currentDate.getUTCDay())) {
        for (const slot of time_slots) {
          const times = periodTimesUTC[slot];
          if (times) {
            const startTime = new Date(currentDate);
            startTime.setUTCHours(times.start[0], times.start[1], 0, 0);
            const endTime = new Date(currentDate);
            endTime.setUTCHours(times.end[0], times.end[1], 0, 0);
            if (endTime < startTime) {
              endTime.setUTCDate(endTime.getUTCDate() + 1);
            }
            bookingsToCreate.push({
              title,
              startTime,
              endTime,
              userId,
              requesterId: userId,
              roomId: room_id,
              classCode: class_code,
              bookingGroupId,
              period: times.period,
            });
          }
        }
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    if (bookingsToCreate.length === 0) {
      return {
        success: false,
        message: 'Nenhuma data válida encontrada para os dias selecionados.',
      };
    }

    // Verificar conflitos de sala
    const roomConflicts = await db.booking.findMany({
      where: {
        roomId: room_id,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
    });

    // Verificar conflitos do usuário
    const userConflicts = await db.booking.findMany({
      where: {
        userId: userId,
        OR: bookingsToCreate.map((b) => ({
          AND: [
            { startTime: { lt: b.endTime } },
            { endTime: { gt: b.startTime } },
          ],
        })),
      },
    });

    const allConflictsMap = new Map<string, (typeof roomConflicts)[0]>();
    for (const c of [...roomConflicts, ...userConflicts]) {
      allConflictsMap.set(c.id, c);
    }

    if (allConflictsMap.size > 0) {
      return {
        success: false,
        message: `Não foi possível criar as reservas. Foram encontrados ${allConflictsMap.size} conflito(s) de horário. Tente outro horário ou sala.`,
      };
    }

    await db.booking.createMany({ data: bookingsToCreate });

    const room = await db.room.findUnique({ where: { id: room_id } });
    await db.auditLog.create({
      data: {
        action: 'CREATE_BOOKING',
        details: `${bookingsToCreate.length} reserva(s) criada(s) via Assistente IA para a turma "${class_code}" na sala "${room?.name}".`,
        userId,
      },
    });

    return {
      success: true,
      message: `✅ ${bookingsToCreate.length} reserva(s) criada(s) com sucesso para a turma "${class_code}" na sala "${room?.name}".`,
    };
  } else {
    // Criar solicitação de reserva (mesma lógica da API de booking-requests)
    const newRequest = await db.bookingRequest.create({
      data: {
        roomId: room_id,
        classCode: class_code,
        timeSlots: time_slots,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        weekdays,
        userId,
        requesterId: userId,
      },
      include: {
        user: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    // Notificar admins
    const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
    await db.notification.createMany({
      data: admins.map((admin) => ({
        message: `Nova solicitação via IA de ${newRequest.user.name} para a turma "${class_code}".`,
        link: '/requests',
        userId: admin.id,
      })),
    });

    await db.auditLog.create({
      data: {
        action: 'CREATE_BOOKING_REQUEST',
        details: `Solicitação via Assistente IA para a turma "${class_code}" na sala "${newRequest.room.name}" foi criada.`,
        userId,
      },
    });

    return {
      success: true,
      message: `✅ Solicitação de reserva enviada com sucesso para a turma "${class_code}" na sala "${newRequest.room.name}". Um administrador irá analisar seu pedido.`,
    };
  }
}

// --- Handler principal ---
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Chave de API do Gemini não configurada.' },
      { status: 500 },
    );
  }

  try {
    const { messages } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeekNames = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const todayDayOfWeek = dayOfWeekNames[today.getDay()];

    const systemInstruction = `Você é o **Nexo AI**, um assistente inteligente e amigável integrado ao sistema de reserva de salas NEXO de uma escola profissionalizante.
Seu objetivo é ajudar os usuários a reservar salas de forma prática e natural, como se estivesse conversando com um colega.

═══════════════════════════════════
📋 INFORMAÇÕES DO CONTEXTO
═══════════════════════════════════
- Usuário logado: ${session.user.name}
- Cargo: ${session.user.role}
- ID: ${session.user.id}
- Data de hoje: ${todayStr} (${todayDayOfWeek})
- Permissão: ${session.user.role === 'ADMIN' ? 'ADMIN — pode criar reservas diretamente.' : 'TEACHER/MANAGER — cria solicitações que precisam de aprovação do admin.'}

═══════════════════════════════════
🗣️ COMPREENSÃO DE LINGUAGEM NATURAL
═══════════════════════════════════

Você DEVE interpretar linguagem coloquial e informal do português brasileiro. Exemplos de como os usuários podem falar e o que significam:

**Referências de tempo relativas (baseie-se na data de hoje ${todayStr}):**
- "amanhã" → dia seguinte a hoje
- "depois de amanhã" → 2 dias após hoje
- "semana que vem", "próxima semana" → segunda a sexta da próxima semana
- "essa semana", "esta semana" → dias restantes desta semana
- "mês que vem", "próximo mês" → mês seguinte
- "segunda", "terça", "quarta", etc. → a próxima ocorrência desse dia
- "segunda que vem" → segunda-feira da próxima semana
- "hoje" → data atual
- "daqui a 3 dias" → hoje + 3 dias
- "início do mês" → dia 1 do próximo mês (ou do mês atual se for início)
- "final do mês" → último dia do mês
- "semestre que vem" → estimar início do próximo semestre letivo

**Referências de período/horário:**
- "de manhã", "pela manhã", "no turno da manhã", "matutino" → período MANHÃ
- "de tarde", "à tarde", "no turno da tarde", "vespertino" → período TARDE
- "de noite", "à noite", "no turno da noite", "noturno" → período NOITE
- "o dia todo", "dia inteiro", "integral", "manhã e tarde" → MANHÃ + TARDE (todos os slots)
- "manhã inteira", "manhã toda", "o período todo de manhã" → MANHA_INTEIRO
- "tarde inteira", "tarde toda" → TARDE_INTEIRO
- "noite inteira", "noite toda" → NOITE_INTEIRO
- "primeiro horário", "1º horário", "primeira aula" → _PRIMEIRO do período mencionado
- "segundo horário", "2º horário", "segunda aula" → _SEGUNDO do período mencionado
- "das 7 às 9", "7:30 às 9:30" → MANHA_PRIMEIRO
- "das 9 às 11", "9:30 às 11:30" → MANHA_SEGUNDO
- "das 13 às 15", "1 da tarde até 3" → TARDE_PRIMEIRO
- "das 15 às 17", "3 às 5 da tarde" → TARDE_SEGUNDO
- "das 18 às 20", "6 e meia às 8" → NOITE_PRIMEIRO
- "das 20 às 21:30", "8 às 9 e meia" → NOITE_SEGUNDO

**Referências a dias da semana:**
- "todo dia", "todos os dias", "de segunda a sexta", "dias úteis" → weekdays [1,2,3,4,5]
- "seg", "segunda" → 1
- "ter", "terça" → 2
- "qua", "quarta" → 3
- "qui", "quinta" → 4
- "sex", "sexta" → 5
- "sáb", "sábado" → 6
- "dom", "domingo" → 0
- "segunda e quarta", "seg e qua" → [1,3]
- "terça e quinta" → [2,4]
- "dias de semana" → [1,2,3,4,5]
- "final de semana" → [0,6]

**Referências a salas (o usuário pode abreviar):**
- "lab", "laboratório" → busque salas do tipo laboratório
- "sala de aula", "sala comum" → busque salas do tipo sala de aula
- "auditório" → busque salas do tipo auditório
- Se o usuário diz um nome parcial como "lab 01", "info 2", "sala 3", busque usando o filtro de nome
- Se disser "qualquer uma", "tanto faz", "a que tiver vaga" → liste as opções disponíveis

**Exemplos de frases naturais e como interpretar:**

1. "Preciso do lab de informática pra terça e quinta de manhã, semana que vem"
   → Sala: buscar por "informática" | Dias: [2,4] | Período: MANHA_INTEIRO | Datas: próx segunda a próx sexta

2. "Quero reservar uma sala pra amanhã à tarde, primeiro horário"
   → Listar salas disponíveis | Dia: amanhã | Slot: TARDE_PRIMEIRO | Weekday: dia da semana de amanhã

3. "Tem alguma sala livre hoje de noite?"
   → Listar salas e verificar disponibilidade para hoje, NOITE_INTEIRO

4. "Bota a sala 5 pra mim toda segunda de manhã até o final do mês"
   → Sala: buscar "sala 5" | Dias: [1] | Período: MANHA_INTEIRO | Datas: hoje até último dia do mês

5. "Reserva o auditório dia 15 à tarde inteira"
   → Sala: buscar auditório | Data: dia 15 do mês atual/próximo | Slot: TARDE_INTEIRO | Weekday: dia da semana do dia 15

6. "Preciso de uma sala grande pra 40 alunos na quarta"
   → Buscar salas com capacidade >= 40 | Dia: próxima quarta | Perguntar período

7. "Cancela", "esquece", "deixa pra lá" → Cancelar o fluxo atual e dizer que está ok

8. "Quero o mesmo horário de sempre" → Perguntar qual é o horário habitual, pois você não tem essa informação

═══════════════════════════════════
📐 REGRAS DO SISTEMA
═══════════════════════════════════

1. **Seja proativo**: se o usuário deu informações suficientes, prossiga sem fazer perguntas desnecessárias.
2. **Colete o que falta de forma natural**: não faça um questionário rígido. Se o usuário disse "quero o lab 01 amanhã de manhã", você já tem sala, data, período. Só precisa do código da turma e confirmação.
3. **Código da turma é obrigatório**: sempre pergunte o código/título da turma se o usuário não informou. Exemplos: "INFO-101", "Programação Web", "Turma A".
4. **Fluxo ideal**:
   a. Identifique o que o usuário quer (sala, datas, período, dias)
   b. Pergunte apenas o que está faltando
   c. Verifique disponibilidade com verificar_disponibilidade
   d. Apresente um resumo formatado e peça confirmação
   e. Só crie a reserva após o "sim", "pode", "confirma", "bora", "manda ver", etc.
5. **Resumo antes de confirmar** — sempre mostre algo como:
   📋 **Resumo da reserva:**
   🏫 Sala: [nome]
   📅 Período: [data início] a [data fim]
   🕐 Horário: [horários]
   📆 Dias: [dias da semana]
   📝 Turma: [código]
   
   Deseja confirmar?
6. **Conflitos**: se houver, explique de forma clara e sugira alternativas (outro horário, outra sala, outro dia).
7. **Confirmação do usuário**: interprete como "sim" qualquer variação: "sim", "s", "ok", "pode", "confirma", "manda", "bora", "vai", "isso", "é isso", "exato", "pode criar", "tá certo", "perfeito", "fechou", "dale".
8. **Negação do usuário**: interprete como "não": "não", "n", "nah", "cancela", "para", "esquece", "deixa", "não quero mais".

═══════════════════════════════════
⏰ HORÁRIOS DISPONÍVEIS (REFERÊNCIA)
═══════════════════════════════════
- **Manhã**: 1º Horário (07:30 - 09:30) = MANHA_PRIMEIRO | 2º Horário (09:30 - 11:30) = MANHA_SEGUNDO | Inteiro = MANHA_INTEIRO
- **Tarde**: 1º Horário (13:00 - 15:00) = TARDE_PRIMEIRO | 2º Horário (15:00 - 17:00) = TARDE_SEGUNDO | Inteiro = TARDE_INTEIRO
- **Noite**: 1º Horário (18:30 - 20:00) = NOITE_PRIMEIRO | 2º Horário (20:00 - 21:30) = NOITE_SEGUNDO | Inteiro = NOITE_INTEIRO

═══════════════════════════════════
🎨 ESTILO DE RESPOSTA
═══════════════════════════════════
- Responda em português do Brasil, de forma simpática e concisa.
- Use emojis com moderação para deixar a conversa agradável (📅 🏫 ✅ ⚠️ 🕐).
- Formate informações importantes em **negrito**.
- Não seja robótico. Converse naturalmente.
- Se o usuário falar algo fora do escopo (piadas, conversa casual), responda brevemente e redirecione educadamente para reservas.
- Nunca invente dados. Sempre use as ferramentas para buscar informações reais do banco de dados.`;

    // Converte histórico de mensagens para o formato do Gemini
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Lista de modelos em ordem de preferência (fallback automático)
    const MODELS = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
    ];

    // Função auxiliar que tenta vários modelos em sequência
    async function callWithFallback(callContents: typeof contents) {
      for (const model of MODELS) {
        try {
          return await ai.models.generateContent({
            model,
            contents: callContents,
            config: {
              tools,
              systemInstruction,
            },
          });
        } catch (err) {
          const errMsg = (err as Error).message || '';
          // Se for 503 (alta demanda) ou 404 (descontinuado), tenta o próximo
          if (errMsg.includes('503') || errMsg.includes('404')) {
            console.warn(`Modelo ${model} indisponível, tentando próximo...`);
            continue;
          }
          // Qualquer outro erro, relança
          throw err;
        }
      }
      throw new Error('Todos os modelos estão indisponíveis no momento.');
    }

    // Chamada inicial
    let response = await callWithFallback(contents);

    // Loop de function calling (iteramos até não ter mais function calls)
    let maxIterations = 5;
    while (maxIterations > 0) {
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const functionCalls = parts.filter((p) => p.functionCall);
      if (functionCalls.length === 0) break;

      // Processar cada function call
      const functionResponses = [];
      for (const part of functionCalls) {
        const fc = part.functionCall!;
        let result;

        try {
          switch (fc.name) {
            case 'listar_salas':
              result = await listarSalas(
                fc.args as {
                  nome?: string;
                  tipo?: string;
                  capacidade_minima?: number;
                },
              );
              break;
            case 'verificar_disponibilidade':
              result = await verificarDisponibilidade(
                fc.args as {
                  room_id: string;
                  start_date: string;
                  end_date: string;
                  time_slots: string[];
                  weekdays?: number[];
                },
              );
              break;
            case 'criar_reserva':
              result = await criarReserva(
                fc.args as {
                  room_id: string;
                  class_code: string;
                  start_date: string;
                  end_date: string;
                  time_slots: string[];
                  weekdays: number[];
                },
                session.user.id,
                session.user.role,
              );
              break;
            default:
              result = { error: `Função desconhecida: ${fc.name}` };
          }
        } catch (error) {
          result = {
            error: `Erro ao executar ${fc.name}: ${(error as Error).message}`,
          };
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: Array.isArray(result) ? { data: result } : result,
          },
        });
      }

      // Envia as respostas das funções de volta ao modelo
      contents.push(candidate!.content);
      contents.push({
        role: 'user',
        parts: functionResponses,
      });

      response = await callWithFallback(contents);

      maxIterations--;
    }

    // Extrai o texto da resposta final
    const finalText =
      response.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        .map((p) => p.text)
        .join('') || 'Desculpe, não consegui processar sua solicitação.';

    return NextResponse.json({ message: finalText });
  } catch (error) {
    console.error('Erro no assistente IA:', error);
    const errMsg = (error as Error).message || '';
    const userMessage = errMsg.includes('indisponíveis')
      ? '⚠️ Os servidores da IA estão com alta demanda no momento. Tente novamente em alguns segundos.'
      : 'Erro interno no assistente. Tente novamente.';
    return NextResponse.json({ message: userMessage }, { status: 500 });
  }
}
