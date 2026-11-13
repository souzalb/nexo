'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  Plus,
  DoorOpen,
  CalendarDays,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AiAssistantLoading } from './ai-assistant-loading';
import type { AssistantSearch } from '../_lib/ai-search-context';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  slotLabels,
  type AssistantProposal,
  type AssistantRoom,
} from '../_lib/ai-assistant-contract';

type Message = {
  searchContext?: AssistantSearch;
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rooms?: AssistantRoom[];
  proposal?: AssistantProposal;
  outcome?: 'sending' | 'done' | 'cancelled' | 'uncertain';
};
const suggestions = [
  {
    icon: DoorOpen,
    label: 'Encontrar uma sala',
    text: 'Preciso de uma sala. Pode me ajudar a escolher?',
  },
  {
    icon: Users,
    label: 'Comparar por compatibilidade',
    text: 'Recomende salas para 25 alunos com projetor.',
  },
  {
    icon: CalendarDays,
    label: 'Planejar uma reserva',
    text: 'Quero reservar uma sala amanhã à tarde.',
  },
];
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dateLabel = (value: string) => value.split('-').reverse().join('/');

// React escapes all text; no model or user HTML is executed.
function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words">
      {text.split('\n').map((line, index) => (
        <p key={index} className="min-h-2 whitespace-pre-wrap">
          {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={i}>{part.slice(2, -2)}</strong>
            ) : part.startsWith('`') && part.endsWith('`') ? (
              <code
                key={i}
                className="bg-muted text-foreground rounded px-1 text-xs"
              >
                {part.slice(1, -1)}
              </code>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

export function AiAssistant() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return (
    <AssistantChat
      key={session.user.id}
      name={session.user.name || 'você'}
      isAdmin={session.user.role === 'ADMIN'}
    />
  );
}

function AssistantChat({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [resetPrompt, setResetPrompt] = React.useState(false);
  const request = React.useRef<AbortController | null>(null);
  const pending = React.useRef(false);
  const bottom = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const scroll = React.useRef<HTMLDivElement>(null);
  const nearBottom = React.useRef(true);
  React.useEffect(() => () => request.current?.abort(), []);
  React.useEffect(() => {
    if (nearBottom.current)
      bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text = input, retry = false, alternativesOnly = false) {
    if (pending.current || (!text.trim() && !retry)) return;
    const history: Message[] = retry
      ? messages
      : [
          ...messages,
          { id: crypto.randomUUID(), role: 'user', content: text.trim() },
        ];
    pending.current = true;
    setBusy(true);
    setError('');
    setInput('');
    nearBottom.current = true;
    setMessages(history);
    request.current = new AbortController();
    const timer = setTimeout(() => request.current?.abort(), 90000);
    try {
      const previous = [...messages]
        .reverse()
        .find((message) => message.searchContext);
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchContext: previous?.searchContext,
          shownRoomIds: previous?.rooms?.map((room) => room.id),
          alternativesOnly,
          messages: history.map(({ role, content, proposal, outcome }) => ({
            role,
            content: proposal
              ? `${content}\nDados da proposta: ${JSON.stringify(proposal)}\nEstado: ${outcome || 'aguardando confirmação no botão'}`
              : content,
          })),
        }),
        signal: request.current.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || 'Não foi possível consultar o assistente.',
        );
      const content =
        result.message || 'Não recebi uma resposta. Tente reformular o pedido.';
      setMessages((current) => [
        ...current.map((item) =>
          result.proposal && item.proposal && !item.outcome
            ? { ...item, outcome: 'cancelled' as const }
            : item,
        ),
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          rooms: result.rooms,
          searchContext: result.searchContext,
          proposal: result.proposal,
        },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== 'AbortError'
          ? cause.message
          : 'A resposta demorou mais que o esperado. Você pode tentar novamente.',
      );
    } finally {
      clearTimeout(timer);
      pending.current = false;
      setBusy(false);
    }
  }

  async function confirm(message: Message) {
    if (pending.current || !message.proposal || message.outcome) return;
    const proposal = message.proposal;
    pending.current = true;
    setBusy(true);
    setError('');
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, outcome: 'sending' } : item,
      ),
    );
    request.current = new AbortController();
    const timer = setTimeout(() => request.current?.abort(), 45000);
    try {
      const response = await fetch(
        isAdmin ? '/api/bookings' : '/api/booking-requests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: request.current.signal,
          body: JSON.stringify({
            roomId: proposal.room_id,
            classCode: proposal.class_code,
            startDate: proposal.start_date,
            endDate: proposal.end_date,
            timeSlots: proposal.time_slots,
            weekdays: proposal.weekdays,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || 'Não foi possível concluir a operação.',
        );
      setMessages((current) => [
        ...current.map((item) =>
          item.id === message.id ? { ...item, outcome: 'done' as const } : item,
        ),
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: isAdmin
            ? `Reserva confirmada para ${proposal.roomName}. Confira em Minhas Reservas.`
            : `Solicitação enviada para ${proposal.roomName}. Aguarde a análise em Minhas Solicitações.`,
        },
      ]);
    } catch {
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, outcome: 'uncertain' } : item,
        ),
      );
      setError(
        'Não foi possível confirmar o resultado do envio. Confira Minhas Reservas ou Minhas Solicitações antes de fazer outro pedido, para evitar duplicidade.',
      );
    } finally {
      clearTimeout(timer);
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 gap-2 rounded-full px-5 shadow-lg sm:right-6 sm:bottom-6"
        aria-label="Abrir Nexo AI"
      >
        <Sparkles className="size-5" />
        Nexo AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(800px,90dvh)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
          <header className="bg-muted/30 flex items-center gap-3 border-b px-5 py-4 pr-12">
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <Bot className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Nexo AI</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Encontre salas e prepare suas reservas.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Nova conversa"
              disabled={busy || !messages.length}
              onClick={() => setResetPrompt(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nova conversa</span>
            </Button>
          </header>
          {resetPrompt && (
            <div className="bg-muted flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm">
              <span>
                Limpar a conversa? Reservas já enviadas serão mantidas.
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetPrompt(false)}
                >
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setMessages([]);
                    setInput('');
                    setError('');
                    setResetPrompt(false);
                  }}
                >
                  Limpar
                </Button>
              </div>
            </div>
          )}
          <div
            ref={scroll}
            onScroll={() => {
              const node = scroll.current;
              if (node)
                nearBottom.current =
                  node.scrollHeight - node.scrollTop - node.clientHeight < 100;
            }}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
          >
            {!messages.length && (
              <div className="py-6 sm:py-10">
                <Badge variant="outline">Seu assistente de espaços</Badge>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  Olá, {name.split(' ')[0]}.<br />
                  Qual espaço você precisa?
                </h2>
                <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
                  Informe a turma, os recursos e o horário. Vou ajudar a
                  encontrar opções e organizar os dados para você revisar.
                </p>
                <div className="mt-6 grid gap-3">
                  {suggestions.map(({ icon: Icon, label, text }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setInput(text);
                        inputRef.current?.focus();
                      }}
                      className="bg-card hover:bg-muted/50 focus-visible:outline-ring flex items-center gap-3 rounded-xl border p-4 text-left focus-visible:outline-2"
                    >
                      <Icon className="text-primary size-5 shrink-0" />
                      <span className="flex-1 text-sm font-medium">
                        {label}
                      </span>
                      <ArrowUpRight className="text-muted-foreground size-4" />
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-5 text-xs">
                  {isAdmin
                    ? 'Você revisa os dados antes de confirmar uma reserva.'
                    : 'Suas solicitações serão encaminhadas para aprovação.'}
                </p>
              </div>
            )}
            <div
              className="space-y-6"
              role="log"
              aria-label="Conversa com Nexo AI"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[90%]'
                      : 'max-w-full'
                  }
                >
                  <p
                    className={`text-muted-foreground mb-2 text-xs font-medium ${message.role === 'user' ? 'text-right' : ''}`}
                  >
                    {message.role === 'user' ? 'Você' : 'Nexo AI'}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted/40 rounded-tl-sm border'}`}
                  >
                    <MessageText text={message.content} />
                  </div>
                  {!!message.rooms?.length && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {message.rooms.map((room) => (
                        <div
                          key={room.id}
                          className="space-y-2 rounded-xl border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm">{room.name}</strong>
                            {room.recommendation && (
                              <Badge variant="secondary">
                                {room.recommendation.score}% compatível
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {room.capacity} lugares · {room.type}
                            {room.location ? ` · ${room.location}` : ''}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {room.resources
                              .map((resource) => resource.name)
                              .join(' · ') || 'Sem recursos cadastrados'}
                          </p>
                          {room.recommendation && (
                            <p className="text-xs">
                              {room.recommendation.reasons.join(' · ')}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void send(
                                `Quero verificar a disponibilidade da sala ${room.name}.`,
                              )
                            }
                          >
                            Ver disponibilidade
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {message.rooms?.length === 1 &&
                    message.rooms[0].recommendation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        disabled={busy}
                        onClick={() =>
                          void send(
                            'Mostre outras opções de salas, mantendo a quantidade de alunos, os recursos e os horários que informei.',
                            false,
                            true,
                          )
                        }
                      >
                        Ver outras opções
                      </Button>
                    )}
                  {message.proposal && (
                    <div className="border-primary/30 mt-3 space-y-4 rounded-xl border p-4">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <CalendarDays className="text-primary size-5" />
                        Revise {isAdmin ? 'sua reserva' : 'sua solicitação'}
                      </h3>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Sala
                          </dt>
                          <dd>{message.proposal.roomName}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Turma / evento
                          </dt>
                          <dd className="break-words">
                            {message.proposal.class_code}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground text-xs">
                            Datas
                          </dt>
                          <dd>
                            {dateLabel(message.proposal.start_date)} até{' '}
                            {dateLabel(message.proposal.end_date)} ·{' '}
                            {message.proposal.weekdays
                              .map((day) => weekdays[day])
                              .join(', ')}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground text-xs">
                            Horários de São Paulo
                          </dt>
                          <dd>
                            {message.proposal.time_slots
                              .map((slot) => slotLabels[slot])
                              .join(' / ')}
                          </dd>
                        </div>
                      </dl>
                      <p className="text-muted-foreground text-xs">
                        {isAdmin
                          ? 'A disponibilidade será verificada novamente no envio.'
                          : 'O envio cria uma solicitação. A reserva depende de aprovação.'}
                      </p>
                      {message.outcome ? (
                        <p className="text-sm font-medium">
                          {
                            {
                              sending: 'Enviando…',
                              done: 'Envio confirmado',
                              cancelled: 'Proposta descartada',
                              uncertain:
                                'Confira o resultado na área de reservas',
                            }[message.outcome]
                          }
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={busy}
                            onClick={() => void confirm(message)}
                          >
                            {isAdmin
                              ? 'Confirmar reserva'
                              : 'Enviar solicitação'}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setMessages((current) =>
                                current.map((item) =>
                                  item.id === message.id
                                    ? {
                                        ...item,
                                        outcome: 'cancelled',
                                        content:
                                          item.content +
                                          '\nProposta descartada pelo usuário.',
                                      }
                                    : item,
                                ),
                              );
                              setInput('Quero ajustar os dados da proposta: ');
                              inputRef.current?.focus();
                            }}
                          >
                            Ajustar dados
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {busy && (
              <AiAssistantLoading
                submitting={messages.some(
                  (message) => message.outcome === 'sending',
                )}
              />
            )}
            {error && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/5 mt-4 space-y-3 rounded-xl border p-4 text-sm"
              >
                <p>{error}</p>
                {messages.at(-1)?.role === 'user' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void send('', true)}
                  >
                    <RotateCcw className="size-4" />
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <footer className="bg-background space-y-3 border-t p-4">
            <div className="text-muted-foreground flex gap-4 text-xs">
              <a href="/rooms-client" className="hover:underline">
                Explorar salas ↗
              </a>
              <a
                href={isAdmin ? '/my-bookings' : '/my-requests'}
                className="hover:underline"
              >
                {isAdmin ? 'Minhas reservas' : 'Minhas solicitações'} ↗
              </a>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="bg-muted/30 focus-within:ring-ring flex items-end gap-2 rounded-xl border p-2 focus-within:ring-2"
            >
              <textarea
                ref={inputRef}
                aria-label="Mensagem para o assistente"
                value={input}
                maxLength={4000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ex.: sala para 25 alunos, amanhã à tarde…"
                rows={2}
                className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-1 text-sm outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Enviar mensagem"
              >
                <Send className="size-4" />
              </Button>
            </form>
            <p className="text-muted-foreground text-[11px]">
              Enter envia · Shift + Enter quebra linha · Revise os dados antes
              de confirmar.
            </p>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  );
}
