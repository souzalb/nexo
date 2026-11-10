#pragma once
// Copy to config.h and fill locally. Never commit real credentials.
#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define MQTT_HOST "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASSWORD ""
#define MQTT_TLS 0
// For MQTT_TLS=1 use the CA certificate of your broker; never disable validation.
#define MQTT_CA_CERT ""
#define DEVICE_ID "esp32-b10"
#define MQTT_TOPIC "salas/b10/movimento"
