export type BrokerStatus =
  'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface MqttMessage {
  id: number;
  receivedAt: string;
  payload: string;
  state: 'DETECTADO' | 'PARADO' | null;
  retained: boolean;
}

export interface MqttSnapshot {
  broker: string;
  topic: string;
  status: BrokerStatus;
  subscribed: boolean;
  connectedAt: string | null;
  startedAt: string;
  lastError: string | null;
  messageCount: number;
  lastReading: MqttMessage | null;
  messages: MqttMessage[];
}
