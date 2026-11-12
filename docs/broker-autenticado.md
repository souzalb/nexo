# Migração para EMQX autenticado — piloto BS-10

O coletor já possui endereço MQTT com TLS nas configurações locais. A liberação automática permanece desabilitada (`IOT_ALLOW_AUTOMATIC_RELEASE=false`). Reinicie processos existentes para carregar as alterações.

## Permissões no EMQX

No deployment, abra Access Control / Client Authentication e confira as duas contas distintas: dispositivo e coletor. Não use contas com permissões irrestritas para a operação final.

Em Client Authorization, configure por Username:

| Conta | Ação permitida | Tópicos |
|---|---|---|
| Dispositivo BS-10 | Publish | `salas/b10/movimento` e `salas/b10/movimento/status` |
| Coletor/painel | Subscribe | `salas/b10/movimento` e `salas/b10/movimento/status` |

As permissões do dispositivo devem aceitar telemetria QoS 0, status retido e Last Will QoS 1. O coletor solicita assinatura QoS 1; o painel solicita QoS 0.

Revise regras existentes e permissões amplas antes de adicionar a negação padrão. No EMQX Serverless, a documentação orienta uma regra final em All Users: tópico `#`, ação Publish & Subscribe, permissão Deny. As regras específicas devem permitir apenas o necessário. Se o broker atende outros dispositivos, configure suas permissões antes de aplicar essa regra global.

## Firmware

O arquivo local `firmware/esp32-pir-secure-local/esp32-pir-secure-local.ino` contém as configurações existentes e pode ser aberto diretamente na Arduino IDE. Está ignorado pelo Git porque contém credenciais. Não o publique nem o anexe ao TCC. Use `firmware/esp32-pir-secure/esp32-pir-secure.ino` com `config.example.h` para documentação sem segredos.

O sketch mantém PIR no GPIO 14, mensagens DETECTADO/PARADO, heartbeat de 30 segundos, aquecimento de 60 segundos e reconexão. Acrescenta TLS com CA, autenticação e sincronização NTP antes da conexão segura. A rede deve permitir NTP e acesso ao broker na porta 8883.

## Verificação e troca do painel

1. Execute `node scripts/check-private-mqtt.cjs`: testa TLS, autenticação e assinatura sem banco nem publicações.
2. Execute `node scripts/check-private-mqtt.cjs --device`: verifica CA e credencial local do dispositivo no computador; não substitui o teste físico e não verifica autorização de publicação.
3. Envie o sketch seguro pela Arduino IDE e acompanhe o Serial em 115200. Aguarde estabilização.
4. Em `.env.local`, defina `ESP32_MQTT_USE_COLLECTOR="true"`. Reinicie o Next.js. O painel passará a usar MQTT_URL, MQTT_USERNAME e MQTT_PASSWORD do coletor. Não é necessário duplicar credenciais em uma URL.
5. Abra BS-10 → Sensor ao vivo. Confirme que as leituras chegam pelo broker privado.
6. Reinicie o coletor, mantenha a sala em Observação e teste uma reserva dentro da janela programada.

Até enviar o firmware e ativar a variável, o painel pode continuar recebendo pelo broker público. Falhas na configuração privada geram erro; não há fallback silencioso para broker público.

Conexão e assinatura aceitas não comprovam que as ACLs negam operações indevidas. Essa auditoria e o teste físico são etapas obrigatórias antes da automação.

Fontes oficiais: [conexão ESP32](https://docs.emqx.com/en/cloud/latest/connect_to_deployments/esp32.html), [autorização](https://docs.emqx.com/en/cloud/latest/deployments/default_authz.html).
