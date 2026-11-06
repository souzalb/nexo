import { connect, type MqttClient } from 'mqtt';
import type { MqttSnapshot } from '@/types/mqtt-monitor';

// One connection per Node process, including across Next.js development reloads.
const globalMqtt = globalThis as unknown as { nexoMqtt?: MqttMonitor };

export class MqttMonitor {
  private client: MqttClient;
  private state: MqttSnapshot;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(url: string, topic: string, connectClient = connect) {
    const address = new URL(url);
    if (
      !['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(address.protocol) ||
      !topic ||
      /[+#\u0000]/.test(topic)
    ) {
      throw new Error('Configuração MQTT inválida.');
    }
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
      clientId: `nexo_admin_${crypto.randomUUID()}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      resubscribe: false,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
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
      const message = {
        id: ++this.state.messageCount,
        receivedAt: new Date().toISOString(),
        payload: value.slice(0, 256),
        state: value === 'DETECTADO' || value === 'PARADO' ? value : null,
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

export function getMqttMonitor() {
  globalMqtt.nexoMqtt ??= new MqttMonitor(
    process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
    process.env.MQTT_PIR_TOPIC || 'salas/b10/movimento',
  );
  return globalMqtt.nexoMqtt;
}
