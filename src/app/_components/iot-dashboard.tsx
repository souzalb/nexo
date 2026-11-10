'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  DoorOpen,
  Search,
  Settings2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MqttMonitorPanel } from './mqtt-monitor-panel';
import { IotAttendancePanel } from './iot-attendance-panel';

type Room = {
  id: string;
  name: string;
  iotConfig: {
    topic: string;
    deviceId: string;
    mode: string;
    warningMinutes: number;
    releaseMinutes: number;
  } | null;
};
const modes: Record<string, string> = {
  OFF: 'Acompanhamento desativado',
  OBSERVE: 'Observação',
  AUTOMATIC: 'Liberação automática',
};

export function IotDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('sensor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;
    setLoading(true);
    fetch('/api/iot/rooms', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'Não foi possível carregar as salas. Verifique sua sessão e tente novamente.',
          );
        const result: Room[] = await response.json();
        if (!active) return;
        setRooms(result);
        setSelectedId((id) =>
          result.some((room) => room.id === id)
            ? id
            : (result.find((room) => room.iotConfig)?.id ??
              result[0]?.id ??
              ''),
        );
        setError('');
      })
      .catch(() => {
        if (active)
          setError(
            'Não foi possível carregar as salas. Verifique sua sessão e tente novamente.',
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refresh]);

  const selected = rooms.find((room) => room.id === selectedId);
  const configured = rooms.filter((room) => room.iotConfig).length;
  const visible = rooms.filter(
    (room) =>
      room.name
        .toLocaleLowerCase('pt-BR')
        .includes(query.trim().toLocaleLowerCase('pt-BR')) &&
      (filter === 'all' ||
        (filter === 'configured' ? !!room.iotConfig : !room.iotConfig)),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Salas cadastradas', rooms.length],
          ['Com sensor configurado', configured],
          ['Sem sensor', rooms.length - configured],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border px-5 py-4">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {loading ? '—' : value}
            </p>
          </div>
        ))}
      </div>
      {error && (
        <div
          role="alert"
          className="border-destructive/40 rounded-xl border p-4 text-sm"
        >
          {error}{' '}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className="bg-card space-y-4 rounded-xl border p-4"
          aria-label="Seleção de sala"
        >
          <div className="flex items-center gap-2 font-semibold">
            <DoorOpen className="size-4" /> Salas
          </div>
          <label className="relative block">
            <span className="sr-only">Buscar sala pelo nome</span>
            <Search className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar sala…"
              className="pl-9"
            />
          </label>
          <label className="text-muted-foreground block space-y-1 text-xs">
            Exibir
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="bg-background text-foreground block h-10 w-full rounded-md border px-2 text-sm"
            >
              <option value="all">Todas as salas</option>
              <option value="configured">Com sensor</option>
              <option value="unconfigured">Sem sensor</option>
            </select>
          </label>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {loading
              ? 'Carregando salas…'
              : `${visible.length} sala(s) encontrada(s)`}
          </p>
          <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 xl:max-h-[540px] xl:grid-cols-1">
            {visible.map((room) => (
              <button
                key={room.id}
                type="button"
                aria-pressed={selectedId === room.id}
                onClick={() => setSelectedId(room.id)}
                className={`focus-visible:outline-ring flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selectedId === room.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {room.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {room.iotConfig
                      ? modes[room.iotConfig.mode]
                      : 'Sem sensor configurado'}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>
            ))}
          </div>
          {!loading && !visible.length && (
            <div className="space-y-2 text-sm">
              <p>Nenhuma sala encontrada.</p>
              {(query || filter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </aside>
        <section
          className="min-w-0 space-y-5"
          aria-label="Detalhes da sala selecionada"
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Sala selecionada
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {selected.name}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Leituras, ocorrências e ajustes deste ambiente.
                  </p>
                </div>
                <Badge variant="outline">
                  {selected.iotConfig
                    ? modes[selected.iotConfig.mode]
                    : 'Configuração pendente'}
                </Badge>
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 p-1">
                  <TabsTrigger value="sensor">
                    <Activity className="mr-2 size-4" />
                    Sensor ao vivo
                  </TabsTrigger>
                  <TabsTrigger value="occurrences">
                    Reservas e ocorrências
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings2 className="mr-2 size-4" />
                    Configurações
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="sensor">
                  {selected.iotConfig ? (
                    <MqttMonitorPanel
                      key={`${selected.id}:${selected.iotConfig.topic}`}
                      roomId={selected.id}
                    />
                  ) : (
                    <div className="bg-card space-y-3 rounded-xl border p-8 text-center">
                      <DoorOpen className="text-muted-foreground mx-auto size-8" />
                      <h3 className="font-semibold">
                        Conecte um sensor à {selected.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Cadastre o dispositivo e o tópico MQTT nas configurações
                        desta sala.
                      </p>
                      <Button onClick={() => setTab('settings')}>
                        Configurar sensor
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="occurrences">
                  <IotAttendancePanel
                    key={`${selected.id}:occurrences`}
                    selectedRoomId={selected.id}
                    view="occurrences"
                  />
                </TabsContent>
                <TabsContent value="settings">
                  <IotAttendancePanel
                    key={`${selected.id}:settings`}
                    selectedRoomId={selected.id}
                    view="settings"
                    onSaved={() => setRefresh((value) => value + 1)}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div
              role="status"
              className="text-muted-foreground rounded-xl border p-10 text-center"
            >
              {loading
                ? 'Preparando o monitoramento…'
                : 'Cadastre uma sala para começar o monitoramento.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
