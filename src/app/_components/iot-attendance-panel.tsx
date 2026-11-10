'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { AttendanceControls } from './attendance-controls';
import { isIotCollectionWindow } from '../_lib/iot/schedule';

type Config = {
  deviceId: string;
  topic: string;
  mode: string;
  warningMinutes: number;
  releaseMinutes: number;
  heartbeatSeconds: number;
  lastSeenAt?: string | null;
  healthySince?: string | null;
  ready?: boolean;
};
type Data = {
  rooms: { id: string; name: string; iotConfig: Config | null }[];
  runtime: {
    lastTickAt: string;
    leaseUntil: string;
    connected: boolean;
    error: string | null;
  } | null;
  automaticAllowed: boolean;
  emailConfigured: boolean;
  emails: {
    id: string;
    sentAt: string | null;
    expiresAt: string;
    error: string | null;
  }[];
  bookings: {
    id: string;
    title: string;
    roomId: string;
    status: string;
    attendance: string;
    startTime: string;
    endTime: string;
    confirmationDeadline: string | null;
    room: { name: string };
    user: { name: string };
    attendanceEvents: { id: string; detail: string; createdAt: string }[];
  }[];
};
const labels: Record<string, string> = {
  WAITING: 'Aguardando verificação',
  VERIFIED: 'Uso confirmado',
  SUSPECTED_NO_SHOW: 'Possível no-show',
  INCONCLUSIVE: 'Inconclusivo — reserva mantida',
};
const initial: Config = {
  deviceId: 'esp32-b10',
  topic: 'salas/b10/movimento',
  mode: 'OBSERVE',
  warningMinutes: 10,
  releaseMinutes: 20,
  heartbeatSeconds: 90,
};
const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleString('pt-BR') : 'Ainda não recebido';

export function IotAttendancePanel({
  selectedRoomId,
  view = 'settings',
  onSaved,
}: {
  selectedRoomId?: string;
  view?: 'settings' | 'occurrences';
  onSaved?: () => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [roomId, setRoomId] = useState('');
  const [form, setForm] = useState<Config>(initial);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const initialized = useRef(false);
  useEffect(() => {
    let active = true;
    let firstLoad = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function load() {
      // Refresh locally while idle; opening the tab still performs one explicit read.
      if (!firstLoad && !isIotCollectionWindow()) {
        timer = setTimeout(load, 10000);
        return;
      }
      firstLoad = false;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(
          selectedRoomId
            ? `/api/iot?roomId=${encodeURIComponent(selectedRoomId)}`
            : '/api/iot',
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            'Não foi possível consultar o acompanhamento. Verifique a sessão e a migração do banco.',
          );
        const result: Data = await response.json();
        if (active) {
          setData(result);
          setError('');
          if (!initialized.current) {
            initialized.current = true;
            const configuredRoom = selectedRoomId
              ? result.rooms.find((room) => room.id === selectedRoomId)
              : result.rooms.find((room) => room.iotConfig);
            if (configuredRoom) {
              setRoomId(configuredRoom.id);
              setForm(
                configuredRoom.iotConfig || {
                  ...initial,
                  deviceId: '',
                  topic: '',
                },
              );
            }
          }
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error && cause.name !== 'AbortError'
              ? cause.message
              : 'O servidor não respondeu. Tentando novamente…',
          );
      } finally {
        clearTimeout(timeout);
        if (active) timer = setTimeout(load, 10000);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [refresh, selectedRoomId]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validTimes) {
      toast.error(
        'O prazo de liberação deve ser maior que o prazo do alerta. Use minutos inteiros dentro dos limites indicados.',
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/iot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, roomId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      toast.success(result.message);
      onSaved?.();
      setRefresh((value) => value + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }
  const alive =
    !error &&
    data?.runtime &&
    new Date(data.runtime.leaseUntil).getTime() > Date.now();
  const validTimes =
    Number.isInteger(form.warningMinutes) &&
    Number.isInteger(form.releaseMinutes) &&
    form.warningMinutes >= 1 &&
    form.warningMinutes <= 29 &&
    form.releaseMinutes > form.warningMinutes &&
    form.releaseMinutes <= 30;
  const bookings =
    data?.bookings.filter(
      (booking) => !selectedRoomId || booking.roomId === selectedRoomId,
    ) ?? [];
  if (!data)
    return (
      <div
        role={error ? 'alert' : 'status'}
        className="rounded-xl border p-6 text-sm"
      >
        {error || 'Carregando os dados desta sala…'}
      </div>
    );
  return (
    <div className="space-y-6">
      {view === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações do ambiente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details className="bg-muted/30 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Status dos serviços de automação · todas as salas
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-muted-foreground text-sm">
                  Coleta diária: 07h25–08h, 12h55–13h30 e 18h25–19h (São Paulo).
                  Fora dessas janelas, o coletor fica pausado para reduzir
                  acessos ao banco.
                </p>
                <p className="text-sm">
                  Coletor contínuo:{' '}
                  <strong>
                    {!isIotCollectionWindow()
                      ? 'Pausado — fora da janela de coleta'
                      : alive
                        ? data?.runtime?.connected
                          ? 'Ativo e conectado'
                          : 'Ativo, aguardando broker'
                        : 'Sem atualização — iniciar o serviço IoT'}
                  </strong>
                </p>
                <p className="text-muted-foreground text-sm">
                  Último ciclo: {formatDate(data?.runtime?.lastTickAt)}.{' '}
                  {data?.runtime?.error}
                </p>
                {error && (
                  <p role="alert" className="text-destructive">
                    {error}
                  </p>
                )}
                <p className="text-sm">
                  A observação envia avisos e registra possíveis no-shows,
                  preservando a reserva. Falhas de comunicação impedem a
                  liberação automática.
                </p>
                <p className="text-sm">
                  E-mail:{' '}
                  {data?.emailConfigured
                    ? 'configurado'
                    : 'não configurado; avisos disponíveis no sistema'}
                  . Nos últimos registros:{' '}
                  {data?.emails.filter((item) => item.sentAt).length ?? 0}{' '}
                  enviados,{' '}
                  {data?.emails.filter(
                    (item) =>
                      !item.sentAt &&
                      new Date(item.expiresAt).getTime() > Date.now(),
                  ).length ?? 0}{' '}
                  pendentes.
                </p>
              </div>
            </details>
            <p className="text-muted-foreground text-sm">
              O sensor ao vivo usa o broker do receptor ESP32. Os prazos abaixo
              pertencem ao acompanhamento de reservas, que exige telemetria
              contínua.
            </p>
            <form
              ref={formRef}
              onSubmit={save}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <h2 className="text-lg font-semibold">
                  Configurar alertas e liberação por sala
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ajuste os prazos e salve. Os valores são contados a partir do
                  início da reserva. A validação termina em até 30 minutos: uma
                  reserva às 13h é acompanhada somente até 13h30.
                </p>
              </div>
              <label className="space-y-1 text-sm">
                Sala
                <select
                  disabled={!!selectedRoomId}
                  required
                  className="bg-background block h-10 w-full rounded-md border px-3"
                  value={roomId}
                  onChange={(event) => {
                    setRoomId(event.target.value);
                    setForm(
                      data?.rooms.find((room) => room.id === event.target.value)
                        ?.iotConfig || initial,
                    );
                  }}
                >
                  <option value="">Selecione a sala</option>
                  {data?.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Identificador do ESP32
                <Input
                  required
                  placeholder="Ex.: esp32-b11"
                  value={form.deviceId}
                  onChange={(e) =>
                    setForm({ ...form, deviceId: e.target.value })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                Tópico MQTT
                <Input
                  required
                  placeholder="Ex.: salas/b11/movimento"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                Modo
                <select
                  className="bg-background block h-10 w-full rounded-md border px-3"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option value="OFF">Desativado</option>
                  <option value="OBSERVE">Observação</option>
                  <option value="AUTOMATIC" disabled={!data?.automaticAllowed}>
                    Liberação automática
                  </option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Enviar alerta após (minutos)
                <Input
                  type="number"
                  min={1}
                  max={29}
                  required
                  step={1}
                  value={form.warningMinutes}
                  onChange={(e) =>
                    setForm({ ...form, warningMinutes: Number(e.target.value) })
                  }
                />
                <span className="text-muted-foreground block text-xs">
                  De 1 a 29 minutos após o início, sem evidência de uso.
                </span>
              </label>
              <label className="space-y-1 text-sm">
                Liberar a sala após (minutos)
                <Input
                  type="number"
                  min={Math.max(2, form.warningMinutes + 1)}
                  max={30}
                  required
                  step={1}
                  value={form.releaseMinutes}
                  onChange={(e) =>
                    setForm({ ...form, releaseMinutes: Number(e.target.value) })
                  }
                />
                <span className="text-muted-foreground block text-xs">
                  Até 30 minutos desde o início da reserva. Deve ser maior que o
                  tempo do alerta.
                </span>
              </label>
              <div
                className="bg-muted/40 space-y-2 rounded-lg border p-4 text-sm sm:col-span-2 lg:col-span-3"
                aria-live="polite"
              >
                {validTimes ? (
                  <>
                    <p>
                      <strong>Resumo dos prazos:</strong> início da reserva →
                      alerta em {form.warningMinutes} min →{' '}
                      {form.mode === 'AUTOMATIC'
                        ? 'liberação em'
                        : 'avaliação de no-show em'}{' '}
                      {form.releaseMinutes} min.
                    </p>
                    <p>
                      O responsável tem{' '}
                      <strong>
                        {form.releaseMinutes - form.warningMinutes} minutos
                      </strong>{' '}
                      entre o alerta e a decisão para confirmar presença.
                    </p>
                  </>
                ) : (
                  <p role="alert" className="text-destructive">
                    Informe prazos inteiros válidos: alerta entre 1 e 29 minutos
                    e liberação depois do alerta, até 30 minutos.
                  </p>
                )}
                <p className="text-muted-foreground">
                  {form.mode === 'OBSERVE'
                    ? 'Em observação, o prazo registra um possível no-show; a sala continua reservada até revisão do administrador.'
                    : form.mode === 'OFF'
                      ? 'O acompanhamento está desativado. Os prazos ficam salvos para quando ele for habilitado.'
                      : 'A liberação só acontece sem confirmação ou atividade, com monitoramento saudável durante a janela.'}
                </p>
                <p className="text-muted-foreground">
                  Ao alterar a configuração, a cobertura do sensor será
                  reavaliada. Reservas já em andamento podem ficar inconclusivas
                  e ser mantidas; prazos de avisos já enviados não são
                  encurtados.
                </p>
              </div>
              <label className="space-y-1 text-sm">
                Tolerância sem heartbeat (segundos)
                <Input
                  type="number"
                  min={45}
                  max={180}
                  required
                  value={form.heartbeatSeconds}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      heartbeatSeconds: Number(e.target.value),
                    })
                  }
                />
              </label>
              <div className="flex items-end">
                <Button
                  disabled={busy || !data || !!error || !roomId || !validTimes}
                >
                  {busy ? 'Salvando…' : 'Salvar configuração da sala'}
                </Button>
              </div>
            </form>
            {!data?.automaticAllowed && (
              <p className="text-muted-foreground text-sm">
                Liberação automática indisponível até configurar um broker
                privado autenticado com TLS e habilitar essa função no servidor.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {view === 'occurrences' && (
        <>
          <div className="bg-muted/30 rounded-lg border p-4 text-sm">
            O sketch original informa mudanças do PIR. A validação automática de
            reservas exige telemetria contínua do coletor; silêncio do sensor
            não confirma ausência.
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="grid gap-4">
            {data?.rooms
              .filter(
                (room) =>
                  room.iotConfig &&
                  (!selectedRoomId || room.id === selectedRoomId),
              )
              .map((room) => {
                const config = room.iotConfig!;
                const healthy =
                  alive &&
                  data?.runtime?.connected &&
                  config.ready &&
                  config.lastSeenAt &&
                  Date.now() - new Date(config.lastSeenAt).getTime() <=
                    config.heartbeatSeconds * 1000;
                return (
                  <Card key={room.id}>
                    <CardHeader>
                      <CardTitle>{room.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        {config.mode === 'OFF'
                          ? 'Desativado'
                          : healthy
                            ? 'Telemetria atualizada'
                            : 'Sem telemetria válida recente'}
                      </p>
                      <p>
                        Modo:{' '}
                        {config.mode === 'OBSERVE'
                          ? 'Observação'
                          : config.mode === 'AUTOMATIC'
                            ? 'Automático'
                            : 'Desativado'}
                      </p>
                      <p>Último sinal: {formatDate(config.lastSeenAt)}</p>
                      <p>
                        Alerta: <strong>{config.warningMinutes} min</strong> ·{' '}
                        {config.mode === 'AUTOMATIC'
                          ? 'Liberação'
                          : 'Avaliação'}
                        : <strong>{config.releaseMinutes} min</strong> após o
                        início.
                      </p>
                      <p>
                        Cobertura contínua desde:{' '}
                        {formatDate(config.healthySince)}
                      </p>
                      {!selectedRoomId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoomId(room.id);
                            setForm(config);
                            formRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                            formRef.current
                              ?.querySelector('select')
                              ?.focus({ preventScroll: true });
                          }}
                        >
                          Ajustar tempos de {room.name}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Ocorrências acompanhadas · últimas 24 horas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!bookings.length && (
                <p className="text-muted-foreground text-sm">
                  {data
                    ? 'Nenhuma ocorrência acompanhada para esta sala nas últimas 24 horas.'
                    : 'Carregando ocorrências…'}
                </p>
              )}
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="space-y-2 rounded-lg border p-4 text-sm"
                >
                  <p className="font-semibold">
                    {booking.room.name} · {booking.user.name} ·{' '}
                    {formatDate(booking.startTime)}
                  </p>
                  <p>
                    {booking.status === 'NO_SHOW'
                      ? 'No-show — ocorrência liberada'
                      : booking.status === 'CANCELLED'
                        ? 'Cancelada'
                        : labels[booking.attendance]}
                  </p>
                  {booking.confirmationDeadline && (
                    <p>
                      Prazo de confirmação:{' '}
                      {formatDate(booking.confirmationDeadline)}
                    </p>
                  )}
                  {booking.attendanceEvents.map((event) => (
                    <p key={event.id} className="text-muted-foreground">
                      {formatDate(event.createdAt)} — {event.detail}
                    </p>
                  ))}
                  {booking.status === 'CONFIRMED' &&
                    new Date(booking.endTime).getTime() > Date.now() && (
                      <div className="flex flex-wrap gap-2">
                        {booking.attendance !== 'VERIFIED' && (
                          <AttendanceControls
                            id={booking.id}
                            onDone={() => setRefresh((value) => value + 1)}
                          />
                        )}
                        {booking.attendance === 'SUSPECTED_NO_SHOW' && (
                          <AttendanceControls
                            id={booking.id}
                            action="release"
                            onDone={() => setRefresh((value) => value + 1)}
                          />
                        )}
                      </div>
                    )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
