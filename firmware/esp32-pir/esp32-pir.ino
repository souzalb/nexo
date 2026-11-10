#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <esp_system.h>
#include <time.h>
#include "config.h"

constexpr int PIR_PIN = 14;
constexpr uint32_t WARMUP_MS = 60000;
constexpr uint32_t HEARTBEAT_MS = 30000;
constexpr uint32_t MQTT_RETRY_MS = 5000;
constexpr uint32_t WIFI_RETRY_MS = 15000;
constexpr uint32_t PUBLISH_RETRY_MS = 1000;

#if MQTT_TLS
WiFiClientSecure transport;
#else
WiFiClient transport;
#endif
PubSubClient mqtt(transport);

String bootId;
String clientId;
String statusTopic = String(MQTT_TOPIC) + "/status";
uint32_t sequence = 0;
uint32_t lastPublish = 0;
uint32_t lastPublishAttempt = 0;
uint32_t lastMqttAttempt = 0;
uint32_t lastWifiAttempt = 0;
uint32_t lastClockLog = 0;
uint32_t lastMotion = 0;
bool sawMotion = false;
bool previousMotion = false;
bool previousReady = false;
bool wifiWasConnected = false;
bool warmupAnnounced = false;
bool initialSamplePending = true;
bool onlineStatusPending = true;

void samplePir(bool &motion, bool &ready) {
  const uint32_t now = millis();
  ready = now >= WARMUP_MS;
  motion = ready && digitalRead(PIR_PIN) == HIGH;
  if (motion) {
    sawMotion = true;
    lastMotion = now;
  }
  if (ready && !warmupAnnounced) {
    Serial.println("[PIR] Estabilizacao concluida. Sensor pronto.");
    warmupAnnounced = true;
  }
}

bool publishSample(bool motion, bool ready) {
  const uint32_t now = millis();
  char age[24];
  if (sawMotion) {
    snprintf(age, sizeof(age), "%lu", (unsigned long)(now - lastMotion));
  } else {
    snprintf(age, sizeof(age), "null");
  }

  char payload[512];
  const int length = snprintf(payload, sizeof(payload),
    "{\"version\":1,\"deviceId\":\"%s\",\"bootId\":\"%s\","
    "\"sequence\":%lu,\"motion\":%s,\"ready\":%s,"
    "\"uptimeMs\":%lu,\"motionAgeMs\":%s}",
    DEVICE_ID, bootId.c_str(), (unsigned long)sequence,
    motion ? "true" : "false", ready ? "true" : "false",
    (unsigned long)now, age);
  if (length < 0 || (size_t)length >= sizeof(payload)) {
    Serial.println("[MQTT] Erro: identificadores excedem o tamanho da mensagem.");
    return false;
  }

  // Nexo ignores retained telemetry as evidence of current occupancy.
  // PubSubClient publishes at QoS 0: true means local send, not broker ACK.
  if (!mqtt.publish(MQTT_TOPIC, payload, false)) {
    Serial.println("[MQTT] Falha ao enviar amostra. Nova tentativa em 1 segundo.");
    return false;
  }
  sequence++;
  lastPublish = now;
  previousMotion = motion;
  previousReady = ready;
  initialSamplePending = false;
  Serial.print("[MQTT] Amostra enviada: ");
  Serial.println(payload);
  return true;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  // Unique for this boot; reconnecting does not reset the sequence.
  char boot[48];
  snprintf(boot, sizeof(boot), "%012llx-%08lx-%08lx",
    (unsigned long long)ESP.getEfuseMac(),
    (unsigned long)esp_random(), (unsigned long)esp_random());
  bootId = boot;
  clientId = String("nexo_") + DEVICE_ID;

  Serial.println("\n--- Nexo: ESP32 + PIR ---");
  Serial.print("[Dispositivo] "); Serial.println(DEVICE_ID);
  Serial.print("[MQTT] Broker: "); Serial.print(MQTT_HOST);
  Serial.print(":"); Serial.println(MQTT_PORT);
  Serial.print("[MQTT] Topico: "); Serial.println(MQTT_TOPIC);
  Serial.println("[PIR] Aguardando 60 segundos de estabilizacao.");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
  Serial.println("[WiFi] Conectando...");

#if MQTT_TLS
  transport.setCACert(MQTT_CA_CERT);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.println("[TLS] Validacao de certificado habilitada; aguardando horario NTP.");
#endif
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  if (!mqtt.setBufferSize(768)) {
    Serial.println("[MQTT] Erro ao reservar buffer de mensagens.");
  }
  mqtt.setKeepAlive(30);
  mqtt.setSocketTimeout(5);
}

void loop() {
  uint32_t now = millis();
  // Avoid millis rollover and sequence overflow; Nexo treats reboot as a gap.
  if (now > 4000000000UL || sequence >= 2147483647UL) ESP.restart();

  bool motion, ready;
  samplePir(motion, ready);

  if (WiFi.status() != WL_CONNECTED) {
    if (wifiWasConnected) {
      Serial.println("[WiFi] Conexao perdida. Aguardando reconexao.");
      wifiWasConnected = false;
      // Close the socket without MQTT DISCONNECT so the broker can emit LWT.
      transport.stop();
    }
    if (now - lastWifiAttempt >= WIFI_RETRY_MS) {
      lastWifiAttempt = now;
      Serial.println("[WiFi] Tentando novamente...");
      WiFi.reconnect();
    }
    delay(100);
    return;
  }
  if (!wifiWasConnected) {
    wifiWasConnected = true;
    Serial.print("[WiFi] Conectado. IP: "); Serial.println(WiFi.localIP());
    lastMqttAttempt = now - MQTT_RETRY_MS;
  }

#if MQTT_TLS
  if (time(nullptr) < 1700000000) {
    if (now - lastClockLog >= 5000) {
      lastClockLog = now;
      Serial.println("[TLS] Aguardando NTP. Verifique acesso da rede a servidores de horario.");
    }
    delay(100);
    return;
  }
#endif

  if (!mqtt.connected()) {
    if (now - lastMqttAttempt < MQTT_RETRY_MS) {
      delay(100);
      return;
    }
    Serial.println("[MQTT] Conectando ao broker...");
    const char *user = MQTT_USER[0] ? MQTT_USER : nullptr;
    const char *password = MQTT_USER[0] ? MQTT_PASSWORD : nullptr;
    const bool connected = mqtt.connect(clientId.c_str(), user, password,
      statusTopic.c_str(), 1, true, "offline");
    lastMqttAttempt = millis();
    if (!connected) {
      Serial.print("[MQTT] Falha. Codigo: "); Serial.println(mqtt.state());
      Serial.println("[MQTT] Verifique host, porta, credenciais e certificado. Nova tentativa em 5 segundos.");
      delay(100);
      return;
    }
    Serial.println("[MQTT] Conectado. Last Will configurado para offline.");
    onlineStatusPending = true;
    initialSamplePending = true;
    lastPublishAttempt = millis() - PUBLISH_RETRY_MS;
  }

  if (!mqtt.loop()) {
    delay(100);
    return;
  }
  // Connection/TLS may take time; read the pin again before publishing.
  samplePir(motion, ready);
  now = millis();
  const bool needsSample = initialSamplePending || motion != previousMotion ||
    ready != previousReady || now - lastPublish >= HEARTBEAT_MS;
  if ((needsSample || onlineStatusPending) && now - lastPublishAttempt >= PUBLISH_RETRY_MS) {
    lastPublishAttempt = now;
    if (onlineStatusPending) {
      onlineStatusPending = !mqtt.publish(statusTopic.c_str(), "online", true);
      if (onlineStatusPending) Serial.println("[MQTT] Falha ao enviar status online.");
    }
    if (needsSample) publishSample(motion, ready);
  }
  delay(100);
}
