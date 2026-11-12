'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Radio,
  Server,
  Timer,
  Pause,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { BrokerStatus, MqttSnapshot } from '@/types/mqtt-monitor';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const statusLabels: Record<BrokerStatus, string> = {
  connecting: 'Conectando',
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  offline: 'Desconectado',
  error: 'Erro de conexão',
};

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Ainda não recebido';
}

export function MqttMonitorPanel({ roomId }: { roomId?: string }) {
  const [data, setData] = useState<MqttSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [messageFilter, setMessageFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (paused) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function update() {
      if (active) setRefreshing(true);
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let retry = true;
      try {
        const response = await fetch(
          roomId
            ? `/api/mqtt?roomId=${encodeURIComponent(roomId)}`
            : '/api/mqtt',
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (response.status === 403) {
          retry = false;
          throw new Error(
            'Sua sessão expirou ou não tem acesso. Entre novamente como administrador.',
          );
        }
        if (!response.ok)
          throw new Error(
            'Não foi possível consultar o monitor MQTT. Verifique o servidor e sua configuração.',
          );
        const snapshot: MqttSnapshot = await response.json();
        if (active) {
          setData(snapshot);
          setError(null);
          setUpdatedAt(new Date().toISOString());
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error && cause.name !== 'AbortError'
              ? cause.message
              : 'O servidor não respondeu. Tente atualizar a conexão.',
          );
      } finally {
        if (active) setRefreshing(false);
        clearTimeout(timeout);
        if (active && retry) timer = setTimeout(update, 2000);
      }
    }
    void update();
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [attempt, roomId, paused]);

  const connected = !error && data?.status === 'connected';
  const reading = data?.lastReading;
  const messages =
    data?.messages.filter(
      (message) =>
        messageFilter === 'all' ||
        (messageFilter === 'unknown'
          ? !message.state
          : message.state === messageFilter),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(messages.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const movement = reading?.state === 'DETECTADO';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`size-2 rounded-full ${paused ? 'bg-amber-500' : error ? 'bg-destructive' : 'bg-primary'}`}
          />
          <span className="font-medium">
            {paused ? 'Visualização pausada' : 'Atualização automática'}
          </span>
          <span className="text-muted-foreground text-xs">
            {paused ? '' : 'a cada 2 s'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPaused((value) => !value);
              setPage(0);
            }}
          >
            {paused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
            {paused ? 'Retomar' : 'Pausar tela'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshing && !paused}
            onClick={() => {
              setPaused(false);
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw
              className={`size-4 ${refreshing && !paused ? 'motion-safe:animate-spin' : ''}`}
            />{' '}
            Atualizar
          </Button>
        </div>
      </div>
      {paused && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          A tela está congelada para consulta do histórico. O ESP32 e o coletor
          continuam operando conforme suas configurações.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 rounded-lg border p-4 text-sm"
        >
          {error} Os dados abaixo podem estar desatualizados.
        </div>
      )}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-7 ${movement ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}
      >
        <div className="flex flex-wrap items-center gap-5">
          <div
            className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${movement ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            <Activity className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Última leitura recebida
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {movement
                ? 'Movimento detectado'
                : reading?.state === 'PARADO'
                  ? 'Sem movimento'
                  : 'Aguardando o sensor'}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {reading
                ? dateLabel(reading.receivedAt)
                : 'A primeira amostra aparecerá após o recebimento pelo servidor.'}
            </p>
          </div>
          <Badge variant="outline">
            {reading?.retained
              ? 'Mensagem retida'
              : reading
                ? 'Leitura recebida'
                : 'Sem leitura'}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-5 border-t pt-4 text-xs">
          Movimento indica atividade no ambiente. “Sem movimento” não confirma
          sala vazia; a leitura acima não é uma confirmação de presença do
          responsável.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="size-4" />
              Servidor → broker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={connected ? 'success' : 'secondary'}>
              {error
                ? 'Sem atualização'
                : data
                  ? statusLabels[data.status]
                  : 'Carregando'}
            </Badge>
            <p className="text-muted-foreground text-xs">
              {connected
                ? `Conectado desde ${dateLabel(data.connectedAt)}`
                : 'Reconexão MQTT automática a cada 5 segundos.'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="size-4" />
              Assinatura do tópico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge
              variant={connected && data?.subscribed ? 'success' : 'secondary'}
            >
              {error
                ? 'Sem atualização'
                : connected && data?.subscribed
                  ? 'Ativa'
                  : 'Aguardando'}
            </Badge>
            <p className="text-muted-foreground text-xs break-all">
              {data?.topic || 'Aguardando configuração do servidor'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="size-4" />
              Mensagens recebidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">
              {data?.messageCount ?? '—'}
            </p>
            <p className="text-muted-foreground text-xs">
              Nesta execução do monitor no servidor.
            </p>
          </CardContent>
        </Card>
      </div>
      {data?.lastError && (
        <p role="status" className="rounded-lg border p-4 text-sm">
          {data.lastError}
        </p>
      )}
      <details className="bg-card rounded-xl border p-5">
        <summary className="focus-visible:outline-ring cursor-pointer font-semibold">
          Conexão e instruções de teste
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <strong>Broker:</strong>{' '}
            <span className="font-mono break-all">
              {data?.broker ?? 'Carregando…'}
            </span>
          </p>
          <p>
            <strong>Como testar:</strong> aguarde a conexão e a assinatura
            ficarem ativas. Depois, mova-se diante do sensor. A mensagem
            DETECTADO deve aparecer aqui; quando a saída do PIR voltar a LOW,
            chegará PARADO.
          </p>
          <p className="text-muted-foreground">
            DETECTADO indica movimento; PARADO indica ausência de movimento no
            PIR, sem garantir que a sala esteja vazia. O sketch com heartbeat
            envia amostras a cada 30 segundos, além das mudanças. Após reiniciar
            a placa, aguarde 60 segundos de estabilização. A conexão com o
            broker não comprova, sozinha, que o ESP32 esteja online.
          </p>
          <p className="text-muted-foreground">
            Este painel apenas recebe dados e não envia comandos ao ESP32.
            Última consulta ao servidor: {dateLabel(updatedAt)}.
          </p>
        </div>
      </details>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de mensagens</CardTitle>
          <p className="text-muted-foreground text-sm">
            Últimas 100 mensagens, da mais recente para a mais antiga. Histórico
            em memória. Não representa os registros gravados no banco pelo
            coletor.
          </p>
          <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            Filtrar mensagens
            <select
              className="bg-background h-9 rounded-md border px-3"
              value={messageFilter}
              onChange={(event) => {
                setMessageFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">Todas as leituras</option>
              <option value="DETECTADO">Movimento detectado</option>
              <option value="PARADO">Sem movimento</option>
              <option value="unknown">Não reconhecidas</option>
            </select>
            <span className="text-muted-foreground text-xs">
              {messages.length} de {data?.messages.length ?? 0} mensagens
            </span>
          </label>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recebida em</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Leitura</TableHead>
                <TableHead>Origem da entrega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages
                .slice(currentPage * 10, currentPage * 10 + 10)
                .map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="whitespace-nowrap">
                      {dateLabel(message.receivedAt)}
                    </TableCell>
                    <TableCell className="max-w-64 font-mono break-all whitespace-normal">
                      <details>
                        <summary className="cursor-pointer text-xs">
                          Ver conteúdo
                        </summary>
                        <pre className="mt-2 max-w-64 text-xs break-all whitespace-pre-wrap">
                          {message.payload || '(vazia)'}
                        </pre>
                      </details>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          message.state === 'DETECTADO'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {message.state === 'DETECTADO'
                          ? 'Movimento'
                          : message.state === 'PARADO'
                            ? 'Sem movimento'
                            : 'Sem leitura válida'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {message.retained
                        ? 'Retida pelo broker'
                        : 'Publicação recebida'}
                    </TableCell>
                  </TableRow>
                ))}
              {!messages.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    {data?.messages.length
                      ? 'Nenhuma mensagem corresponde ao filtro selecionado.'
                      : data?.subscribed
                        ? 'Escutando o tópico. Aguarde o próximo heartbeat ou uma mudança no PIR.'
                        : 'Aguardando a conexão e a assinatura do tópico.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {messages.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Página {currentPage + 1} de {pages} · Pause a tela para navegar
                sem novas entradas.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={currentPage === 0}
                  onClick={() => {
                    setPaused(true);
                    setPage(currentPage - 1);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Próxima página"
                  disabled={currentPage >= pages - 1}
                  onClick={() => {
                    setPaused(true);
                    setPage(currentPage + 1);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
