#pragma once
#define WIFI_SSID "YOUR_WIFI"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define MQTT_HOST "YOUR_DEPLOYMENT.emqxsl.com"
#define MQTT_PORT 8883
#define MQTT_USER "esp32-bs10"
#define MQTT_PASSWORD "DEVICE_PASSWORD"
#define DEVICE_ID "esp32-b10"
#define MQTT_TOPIC "salas/b10/movimento"
// Obtain the CA from the deployment console; never use setInsecure().
static const char* MQTT_CA_CERT = R"PEM(-----BEGIN CERTIFICATE-----
REPLACE_WITH_THE_DEPLOYMENT_CA
-----END CERTIFICATE-----
)PEM";
