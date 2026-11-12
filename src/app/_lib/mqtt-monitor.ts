import { connect, type MqttClient } from 'mqtt';
import type { MqttSnapshot } from '@/types/mqtt-monitor';
import { telemetrySchema } from './iot/rules';

// One connection per Node process, including across Next.js development reloads.
const globalMqtt = globalThis as unknown as {
  nexoMqtt?: MqttMonitor;
  nexoMqttConfig?: string;
  nexoRoomMonitors?: Map<
    string,
    { monitor: MqttMonitor; timer: ReturnType<typeof setTimeout> }
  >;
};

// This receiver follows the original ESP32 sketch. Do not inherit the private
// broker or credentials configured for the separate attendance collector.
export function getEsp32ReceiverConfig() {
  if (process.env.ESP32_MQTT_USE_COLLECTOR === 'true') {
    const url = process.env.MQTT_URL || '';
    const address = new URL(url);
    if (
      !['mqtts:', 'wss:'].includes(address.protocol) ||
      !process.env.MQTT_USERNAME ||
      !process.env.MQTT_PASSWORD
    )
      throw new Error('O receptor privado exige TLS e credenciais do coletor.');
    return {
      url,
      topic: process.env.ESP32_MQTT_TOPIC || 'salas/b10/movimento',
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    };
  }
  return {
    url: process.env.ESP32_MQTT_URL || 'mqtt://broker.hivemq.com:1883',
    topic: process.env.ESP32_MQTT_TOPIC || 'salas/b10/movimento',
  };
}

export class MqttMonitor {
  private client: MqttClient;
  private state: MqttSnapshot;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(
    url: string,
    topic: string,
    connectClient = connect,
    credentials?: { username?: string; password?: string },
  ) {
    const address = new URL(url);
    if (
      !['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(address.protocol) ||
      !topic ||
      /[+#\u0000]/.test(topic)
    ) {
      throw new Error('Configuração MQTT inválida.');
    }
    if (credentials && !['mqtts:', 'wss:'].includes(address.protocol))
      throw new Error('Credenciais exigem TLS.');
    this.state = {
      broker: `${address.protocol}//${address.host}${address.pathname}`,
      topic,
      status: 'connecting',
      subscribed: false,
      connectedAt: null,
      startedAt: new Date().toISOString(),
      lastError: null,
      messageCount: 0,
      lastReading: null,
      messages: [],
    };
    this.client = connectClient(url, {
      ...credentials,
      rejectUnauthorized: true,
      clientId: `nexo_admin_${crypto.randomUUID()}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      resubscribe: false,
    });
    this.client.on('connect', () => {
      clearTimeout(this.retryTimer);
      this.state.status = 'connected';
      this.state.connectedAt = new Date().toISOString();
      this.state.lastError = null;
      this.state.subscribed = false;
      this.client.subscribe(topic, { qos: 0 }, (error, granted) => {
        if (!this.client.connected) return;
        this.state.subscribed =
          !error &&
          !!granted?.some((item) => item.topic === topic && item.qos !== 128);
        if (!this.state.subscribed) {
          this.state.lastError =
            'O broker não confirmou a assinatura do tópico. Nova tentativa em 5 segundos.';
          // Reconnect so a rejected subscription is retried as well.
          this.retryTimer = setTimeout(() => this.client.reconnect(), 5000);
        }
      });
    });
    this.client.on('reconnect', () => {
      this.state.status = 'reconnecting';
      this.state.subscribed = false;
    });
    this.client.on('close', () => {
      clearTimeout(this.retryTimer);
      this.state.status = 'offline';
      this.state.subscribed = false;
    });
    this.client.on('error', () => {
      this.state.status = 'error';
      // Do not expose credentials potentially included in transport errors.
      this.state.lastError =
        'Falha na comunicação MQTT. Verifique o endereço, a rede e as credenciais do broker.';
    });
    this.client.on('message', (receivedTopic, payload, packet) => {
      if (receivedTopic !== topic) return;
      const value = payload.toString('utf8');
      let state: 'DETECTADO' | 'PARADO' | null =
        value === 'DETECTADO' || value === 'PARADO' ? value : null;
      if (payload.length <= 2048) {
        try {
          const sample = telemetrySchema.safeParse(JSON.parse(value));
          if (sample.success && sample.data.ready)
            state = sample.data.motion ? 'DETECTADO' : 'PARADO';
        } catch {
          /* Legacy firmware sends plain text. */
        }
      }
      const message = {
        id: ++this.state.messageCount,
        receivedAt: new Date().toISOString(),
        payload: value.slice(0, 256),
        state,
        retained: packet.retain,
      } as MqttSnapshot['messages'][number];
      if (message.state) this.state.lastReading = message;
      this.state.messages = [message, ...this.state.messages].slice(0, 100);
    });
  }

  snapshot(): MqttSnapshot {
    return { ...this.state, messages: [...this.state.messages] };
  }

  stop() {
    clearTimeout(this.retryTimer);
    this.client.end(true);
  }
}

export function getMqttMonitor(roomTopic?: string) {
  const config = getEsp32ReceiverConfig();
  const { url, topic } = config;
  const credentials =
    'username' in config
      ? { username: config.username, password: config.password }
      : undefined;
  if (roomTopic && roomTopic !== topic) {
    const monitors = (globalMqtt.nexoRoomMonitors ??= new Map());
    const key = JSON.stringify([url, roomTopic, credentials]);
    const previous = monitors.get(key);
    // Only opened rooms consume a connection. Release idle diagnostics after 15 min.
    if (!previous && monitors.size >= 50)
      throw new Error('Limite de monitores ativos.');
    const monitor =
      previous?.monitor ??
      new MqttMonitor(url, roomTopic, connect, credentials);
    clearTimeout(previous?.timer);
    const timer = setTimeout(
      () => {
        monitor.stop();
        monitors.delete(key);
      },
      15 * 60 * 1000,
    );
    timer.unref?.();
    monitors.set(key, { monitor, timer });
    return monitor;
  }
  const key = JSON.stringify([url, topic, credentials]);
  if (!globalMqtt.nexoMqtt || globalMqtt.nexoMqttConfig !== key) {
    globalMqtt.nexoMqtt?.stop();
    globalMqtt.nexoMqtt = new MqttMonitor(url, topic, connect, credentials);
    globalMqtt.nexoMqttConfig = key;
  }
  return globalMqtt.nexoMqtt;
}
