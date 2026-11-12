#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_system.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include "config.h"

// Preencha somente as credenciais da sua rede antes de enviar pela Arduino IDE.
const char* ssid = "WIFI_CFP106_IOT_2.5GHZ";
const char* password = "ac1ce0ss6@IOT2.5";
const char* mqtt_server = MQTT_HOST;
const char* topico_mqtt = MQTT_TOPIC;
const char* deviceId = DEVICE_ID;
const int pirPin = 14;
const unsigned long HEARTBEAT_MS = 30000;
const unsigned long AQUECIMENTO_MS = 60000;

WiFiClientSecure espClient;
PubSubClient client(espClient);
String bootId;
String clientId;
String topicoStatus;
unsigned long sequencia = 0;
unsigned long ultimoHeartbeat = 0;
unsigned long ultimaTentativa = 0;
unsigned long ultimaTentativaMqtt = 0;
unsigned long ultimaTentativaWifi = 0;
unsigned long ultimoMovimento = 0;
int ultimoEstado = -1;
bool houveMovimento = false;
bool prontoPublicado = false;
bool amostraPendente = true;
bool statusPendente = true;
bool pronto = false;

void setup_wifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);
  ultimaTentativaWifi = millis();
  Serial.println("[WiFi] Conectando...");
}

void reconnect() {
  const unsigned long agora = millis();
  if (agora - ultimaTentativaMqtt < 5000) return;
  ultimaTentativaMqtt = agora;
  Serial.println("[MQTT] Tentando conexao...");
  // O broker publica offline se perder a conexao com esta placa.
  if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, topicoStatus.c_str(), 1, true, "offline")) {
    Serial.println("[MQTT] Conectado!");
    amostraPendente = true;
    statusPendente = true;
    ultimoEstado = -1;
    ultimaTentativa = millis() - 1000;
  } else {
    Serial.print("[MQTT] Falha, codigo: ");
    Serial.println(client.state());
  }
}

bool publicarHeartbeat(bool movimento) {
  const unsigned long agora = millis();
  char idade[24];
  if (houveMovimento) snprintf(idade, sizeof(idade), "%lu", agora - ultimoMovimento);
  else snprintf(idade, sizeof(idade), "null");
  char mensagem[512];
  const int tamanho = snprintf(mensagem, sizeof(mensagem),
    "{\"version\":1,\"deviceId\":\"%s\",\"bootId\":\"%s\","
    "\"sequence\":%lu,\"motion\":%s,\"ready\":%s,"
    "\"uptimeMs\":%lu,\"motionAgeMs\":%s}",
    deviceId, bootId.c_str(), sequencia, movimento ? "true" : "false",
    pronto ? "true" : "false", agora, idade);
  if (tamanho < 0 || (size_t)tamanho >= sizeof(mensagem)) return false;
  // Nao reter: uma mensagem antiga nao deve comprovar presenca atual.
  if (!client.publish(topico_mqtt, mensagem, false)) return false;
  sequencia++;
  ultimoHeartbeat = agora;
  prontoPublicado = pronto;
  amostraPendente = false;
  Serial.print("[Heartbeat] Enviado: ");
  Serial.println(mensagem);
  return true;
}

void setup() {
  Serial.begin(115200);
  pinMode(pirPin, INPUT);
  char identificador[48];
  snprintf(identificador, sizeof(identificador), "%012llx-%08lx-%08lx",
    (unsigned long long)ESP.getEfuseMac(),
    (unsigned long)esp_random(), (unsigned long)esp_random());
  bootId = identificador;
  clientId = String("ESP32_PIR_") + bootId;
  topicoStatus = String(topico_mqtt) + "/status";
  Serial.println("\n--- PIR com heartbeat a cada 30 segundos ---");
  Serial.println("[PIR] Aguarde 60 segundos de estabilizacao.");
  setup_wifi();
  espClient.setCACert(MQTT_CA_CERT);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  client.setServer(mqtt_server, MQTT_PORT);
  if (!client.setBufferSize(768)) Serial.println("[MQTT] Falha ao reservar buffer.");
  client.setKeepAlive(30);
  client.setSocketTimeout(3);
  ultimaTentativaMqtt = millis() - 5000;
}

void loop() {
  unsigned long agora = millis();
  // Evita ambiguidade no uptime apos o rollover de millis().
  if (agora > 4000000000UL || sequencia >= 2147483647UL) ESP.restart();
  pronto = agora >= AQUECIMENTO_MS;
  int estadoAtual = digitalRead(pirPin);
  if (pronto && estadoAtual == HIGH) {
    houveMovimento = true;
    ultimoMovimento = agora;
  }
  if (WiFi.status() != WL_CONNECTED) {
    espClient.stop();
    if (agora - ultimaTentativaWifi >= 15000) {
      ultimaTentativaWifi = agora;
      WiFi.reconnect();
      Serial.println("[WiFi] Tentando reconectar...");
    }
    delay(100);
    return;
  }
  if (time(nullptr) < 1700000000) { delay(100); return; } // Aguarda NTP para validar o certificado.
  if (!client.connected()) reconnect();
  if (!client.connected() || !client.loop()) { delay(100); return; }

  // A conexao pode demorar: releia o sensor antes de enviar.
  agora = millis();
  pronto = agora >= AQUECIMENTO_MS;
  estadoAtual = digitalRead(pirPin);
  if (pronto && estadoAtual == HIGH) { houveMovimento = true; ultimoMovimento = agora; }
  if (agora - ultimaTentativa >= 1000) {
    ultimaTentativa = agora;
    if (statusPendente) statusPendente = !client.publish(topicoStatus.c_str(), "online", true);
    if (pronto && estadoAtual != ultimoEstado) {
      const char* mensagem = estadoAtual == HIGH ? "DETECTADO" : "PARADO";
      amostraPendente = true;
      if (client.publish(topico_mqtt, mensagem, false)) {
        ultimoEstado = estadoAtual;
        Serial.print("[PIR] "); Serial.println(mensagem);
      }
    }
    if (amostraPendente || pronto != prontoPublicado || agora - ultimoHeartbeat >= HEARTBEAT_MS) {
      if (!publicarHeartbeat(pronto && estadoAtual == HIGH)) Serial.println("[Heartbeat] Falha; tentando novamente.");
    }
  }
  delay(100);
}
