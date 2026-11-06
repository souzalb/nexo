# Monitoramento ESP32 / PIR

Acesse **Monitoramento ESP32** no menu administrativo (`/mqtt`). A página e a API `GET /api/mqtt` exigem sessão com papel `ADMIN`.

O servidor Next.js se conecta via MQTT/TCP a `broker.hivemq.com:1883` e assina `salas/b10/movimento`. O navegador consulta o diagnóstico a cada 2 segundos. A biblioteca MQTT.js faz a reconexão automática; a assinatura é refeita após cada conexão.

Não é necessário alterar o firmware fornecido. As mensagens são interpretadas exatamente como `DETECTADO` e `PARADO`. Outros payloads aparecem no histórico sem substituir a última leitura válida. A aplicação não publica comandos no tópico do sensor.

## Configuração

Valores opcionais em `.env`, com os mesmos padrões do firmware:

```dotenv
MQTT_URL="mqtt://broker.hivemq.com:1883"
MQTT_PIR_TOPIC="salas/b10/movimento"
```

Para um broker autenticado, configure também `MQTT_USERNAME` e `MQTT_PASSWORD` somente no servidor. Reinicie a aplicação após alterar essas variáveis. A senha do Wi-Fi do ESP32 não é necessária no Nexo.

## Teste com o dispositivo

1. Inicie a aplicação (`npm run dev`) e abra `/mqtt` como administrador.
2. Confira **Conectado** e assinatura **Ativa**.
3. Ligue o ESP32 e confira a conexão MQTT no Serial Monitor (115200 baud).
4. Gere uma mudança no PIR: `DETECTADO` deve aparecer com horário de recebimento.
5. Aguarde a saída do PIR voltar a LOW: deve aparecer `PARADO`.

Teste automatizado da conexão e interpretação: `node --test tests/mqtt-monitor.test.cjs`.

## Limites do diagnóstico

- O firmware publica somente mudanças, sem retenção, heartbeat ou Last Will. Antes da primeira mudança, a leitura fica desconhecida. Não é possível determinar se o ESP32 está online a partir do silêncio; a interface mostra isso explicitamente.
- O horário mostrado é o recebimento no servidor, não o momento de detecção. Mensagens retidas são identificadas separadamente.
- O histórico mantém até 100 mensagens em memória por processo e começa na primeira consulta autorizada. Reinícios apagam o histórico. Para coleta contínua em múltiplas réplicas ou hospedagem serverless, use um consumidor MQTT persistente com armazenamento compartilhado. Esta implementação é voltada a um servidor Node persistente.
- O broker e o tópico atuais são públicos; não há garantia de autoria das mensagens. PIR sem movimento não prova ausência de pessoas.

Referências: [MQTT.js](https://github.com/mqttjs/MQTT.js) e [broker público HiveMQ](https://www.hivemq.com/mqtt/public-mqtt-broker/).
