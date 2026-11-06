'use client';

import { useEffect, useState } from 'react';
import { Activity, Radio, Server, Timer } from 'lucide-react';
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

export function MqttMonitorPanel() {
  const [data, setData] = useState<MqttSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function update() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let retry = true;
      try {
        const response = await fetch('/api/mqtt', {
          cache: 'no-store',
          signal: controller.signal,
        });
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
  }, [attempt]);

  const connected = !error && data?.status === 'connected';
  const reading = data?.lastReading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Atualização a cada 2 segundos · Última consulta:{' '}
          {dateLabel(updatedAt)}
        </p>
        <Button
          variant="outline"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Atualizar agora
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 rounded-lg border p-4 text-sm"
        >
          {error} Os dados abaixo podem estar desatualizados.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <Activity className="size-4" />
              Último estado do PIR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">
              {reading?.state === 'DETECTADO'
                ? 'Movimento detectado'
                : reading?.state === 'PARADO'
                  ? 'Sem movimento'
                  : 'Aguardando leitura'}
            </p>
            <p className="text-muted-foreground text-xs">
              {reading
                ? dateLabel(reading.receivedAt)
                : 'Mova-se diante do sensor para gerar uma mensagem.'}
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
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico da comunicação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Broker:</strong>{' '}
            <span className="font-mono break-all">
              {data?.broker ?? 'Carregando…'}
            </span>
          </p>
          <p>
            <strong>ESP32:</strong> disponibilidade desconhecida. O firmware
            atual publica apenas mudanças de estado, sem heartbeat ou aviso de
            desconexão. Uma conexão ativa com o broker não confirma que o ESP32
            esteja ligado.
          </p>
          <p className="text-muted-foreground">
            DETECTADO indica movimento; PARADO indica ausência de movimento no
            PIR, sem garantir que a sala esteja vazia. Sem mensagem retida, é
            necessário aguardar a próxima mudança após conectar.
          </p>
          <p className="text-muted-foreground">
            O tópico é público: mensagens podem vir de outros clientes. O
            monitor apenas recebe dados e não envia comandos ao ESP32.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de mensagens</CardTitle>
          <p className="text-muted-foreground text-sm">
            Últimas 100 mensagens, da mais recente para a mais antiga. Histórico
            em memória, reiniciado junto com o servidor.
          </p>
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
              {data?.messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="whitespace-nowrap">
                    {dateLabel(message.receivedAt)}
                  </TableCell>
                  <TableCell className="max-w-64 font-mono break-all whitespace-normal">
                    {message.payload || '(vazia)'}
                  </TableCell>
                  <TableCell>
                    {message.state === 'DETECTADO'
                      ? 'Movimento'
                      : message.state === 'PARADO'
                        ? 'Sem movimento'
                        : 'Payload não reconhecido'}
                  </TableCell>
                  <TableCell>
                    {message.retained
                      ? 'Retida pelo broker'
                      : 'Publicação recebida'}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.messages.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    {data?.subscribed
                      ? 'Escutando o tópico. Aguarde uma mudança no sensor PIR.'
                      : 'Aguardando a conexão e a assinatura do tópico.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
