# ESP32: uso de salas e no-show

O menu **Monitoramento ESP32** (`/mqtt`) tem duas abas:

- **Uso das salas:** associa dispositivo e sala, configura prazos, mostra saúde do coletor e revisa ocorrências. Somente administradores acessam configuração e liberação manual.
- **Sensor PIR (aba inicial):** recebe o sketch original, sem modificações, em `broker.hivemq.com:1883`, tópico `salas/b10/movimento`. Mostra `DETECTADO` / `PARADO`, horário e 100 mensagens em memória. A conexão começa ao consultar a tela e permanece enquanto o processo Node estiver ativo. Não executa regras de reservas. Usa `ESP32_MQTT_URL` e `ESP32_MQTT_TOPIC`, independentes de `MQTT_URL` e das credenciais do coletor EMQX. O firmware só publica mudanças; aguarde uma mudança após conectar, sem interpretar silêncio como dispositivo offline.

## Instalação e execução

1. Instale dependências com `npm ci`. O coletor usa `ts-node`, portanto mantenha as dependências de desenvolvimento nesse serviço.
2. Configure o mesmo `DATABASE_URL` na aplicação e no coletor. Execute `npx prisma migrate deploy` e `npx prisma generate`. O Prisma CLI lê `.env`; aplicação e coletor também leem `.env.local`, que tem precedência. Evite URLs diferentes.
3. Execute `npm run dev` ou o build/start normal da aplicação.
4. Em outro processo persistente, execute `npm run iot:worker`. Em produção, gerencie esse processo com o supervisor da hospedagem, separado do Next.js, com reinício automático. Não hospede o coletor como função serverless.
5. No admin, selecione a sala, informe o dispositivo e o tópico e salve em **Observação**. Assinaturas são atualizadas a cada 10 segundos.
6. Instale o firmware atualizado no ESP32.

`npm run iot:worker -- --check` testa as tabelas sem conectar ao MQTT nem enviar e-mail. A coleta não depende de uma página aberta. Uma concessão de 60 segundos no banco impede dois coletores ativos; após encerramento abrupto, aguarde sua expiração para reiniciar. Reinícios e desconexões invalidam a cobertura contínua.

## Firmware

Para atualizar o sketch original mantendo `DETECTADO` e `PARADO`, use [o sketch com heartbeat](../firmware/esp32-pir-heartbeat/esp32-pir-heartbeat.ino) e siga [o passo a passo](../firmware/esp32-pir-heartbeat/README.md). Ele funciona em um único arquivo na Arduino IDE e acrescenta telemetria JSON a cada 30 segundos. O firmware com TLS descrito abaixo é uma alternativa para broker privado.

Abra `firmware/esp32-pir/esp32-pir.ino` na Arduino IDE com suporte ESP32 e biblioteca **PubSubClient**. Copie `config.example.h` para `config.h` e preencha Wi-Fi, broker, credenciais, `DEVICE_ID` e `MQTT_TOPIC`. `config.h` está no `.gitignore`. Use Serial Monitor em 115200 baud e PIR no GPIO 14.

O firmware aguarda 60 segundos de estabilização, envia uma amostra inicial e publica a cada mudança ou 30 segundos. Publica `online` / `offline` retidos em `<tópico>/status` com Last Will. A telemetria não é retida:

```json
{
  "version": 1,
  "deviceId": "esp32-b10",
  "bootId": "boot-unique",
  "sequence": 12,
  "motion": false,
  "ready": true,
  "uptimeMs": 900000,
  "motionAgeMs": null
}
```

`motionAgeMs` é o tempo desde o último movimento nesta inicialização, ou `null` se ainda não houve movimento. O coletor usa horário de recebimento e deduplica por dispositivo, inicialização e sequência. Amostras retidas, antigas, malformadas, de outro dispositivo ou do firmware antigo não estabelecem cobertura. O firmware antigo continua funcionando no diagnóstico, mas precisa ser atualizado para acompanhamento de no-show.

PubSubClient publica com QoS 0. Heartbeat e tempo desde o último movimento recuperam o estado após perdas pontuais; lacunas maiores que a tolerância suspendem a decisão. Para garantias de entrega de eventos individuais, use um cliente ESP32 com publicação QoS 1 e mantenha deduplicação no servidor.

## Regras

### Coleta por período e acesso ao banco

O coletor usa o relógio local de `America/Sao_Paulo`, sem consultar o banco para descobrir se está na janela. Ativa diariamente às **07h25–08h, 12h55–13h30 e 18h25–19h**. Os cinco minutos anteriores ao período permitem receber heartbeats e estabelecer cobertura antes da reserva. Os segundos horários (09h30, 15h e 20h) não abrem uma nova janela de coleta.

Fora dessas janelas, não cria cliente Prisma nem conexão MQTT para coleta. Ao encerrar uma janela, realiza a limpeza final da concessão e da cobertura e desconecta; mensagens não são acumuladas para gravação posterior. Dentro da janela, consultas de saúde, avaliação e envio de avisos continuam normalmente. `--check` é uma verificação manual que acessa o banco a qualquer horário.

O receptor do painel é independente e continua disponível. Abrir telas, autenticar ou usar outras funções pode acessar o banco; a programação reduz atividade do coletor e não garante suspensão de todo o banco. A aba de acompanhamento faz uma consulta ao abrir, mas pausa sua atualização automática fora das janelas. Reinicie o processo `npm run iot:worker` para carregar esta alteração.

- Padrões por sala: aviso em 10 minutos, decisão em 20 minutos, tolerância de heartbeat de 90 segundos.
- A janela exige cobertura contínua desde o início da reserva. Falhas, inicialização tardia e reinícios deixam o resultado **inconclusivo**, preservando a reserva.
- Apenas atividade a partir do início e durante os primeiros 30 minutos pode confirmar uso por PIR. Uma reserva às 13h tem janela até 13h30. Isso indica movimento, não a identidade do responsável.
- Os prazos configuráveis ficam dentro dessa janela: alerta de 1 a 29 minutos e decisão depois do alerta, até 30 minutos. O heartbeat continua para diagnóstico durante o dia; fora da janela não altera a validação por PIR. Se o serviço perder o limite, preserva a reserva como inconclusiva em vez de liberar atrasado.
- O aviso é criado uma vez para `Booking.userId`, com link a **Minhas Reservas**. Se o trabalho atrasar, o responsável ainda recebe todo o intervalo entre aviso e decisão. Se esse intervalo ultrapassar os primeiros 30 minutos ou o fim da reserva, a ocorrência fica inconclusiva e nenhum alerta tardio é enviado.
- O responsável ou administrador confirma presença durante a reserva ativa. A confirmação impede no-show posterior. Uma reserva liberada não é reativada por confirmação atrasada.
- **Observação:** marca possível no-show e mantém a reserva; administrador pode revisar e liberar somente aquela ocorrência.
- **Automático:** sem movimento nem confirmação após o prazo, com cobertura saudável e infraestrutura habilitada, marca `NO_SHOW` e libera somente aquele `Booking.id`. Outras ocorrências do `bookingGroupId` permanecem intactas.
- Cancelamentos comuns usam `CANCELLED`. Ambos preservam o registro e são excluídos de calendário, disponibilidade e conflitos. Histórico pessoal e relatórios continuam mostrando-os.
- Decisões e confirmações usam transações serializáveis com repetição em conflitos. Alertas, alterações e auditoria da decisão são persistidos juntos. `AttendanceEvent` guarda o histórico específico de uso, exibido no painel. Configuração administrativa também aparece no log geral.

## E-mail e produção

```dotenv
MQTT_URL="mqtt://broker.hivemq.com:1883"
MQTT_PIR_TOPIC="salas/b10/movimento"
IOT_ALLOW_AUTOMATIC_RELEASE="false"
# RESEND_API_KEY="..."
# IOT_EMAIL_FROM="Nexo <reservas@seu-dominio.com>"
```

Sem remetente e chave Resend, a notificação interna funciona e o painel informa que e-mail não está configurado. E-mails têm fila persistente, chave de idempotência e repetição a cada minuto até o prazo. Confirmações invalidam e-mails pendentes. Mensagem interna não significa leitura; aceite do provedor não garante entrega na caixa de entrada.

Para habilitar **Automático**, configure `MQTT_URL` com `mqtts://` ou `wss://` para um broker privado, `MQTT_USERNAME`, `MQTT_PASSWORD` e `IOT_ALLOW_AUTOMATIC_RELEASE=true`. Configure TLS e certificado CA no firmware. Reinicie os processos após alterar variáveis. Não desative validação TLS. Use credenciais por dispositivo e ACL permitindo publicar somente no tópico desse dispositivo e em seu `/status`; o coletor deve apenas assinar os tópicos necessários. O sistema não provisiona o broker nem verifica suas ACLs.

O broker público serve ao piloto em observação; não oferece autoria confiável para cancelamento automático. Pessoas imóveis podem não ser detectadas pelo PIR. Confirmação manual e piloto são essenciais para avaliar falsos positivos.

## Validação

`npm run test:iot` cobre prazos, aviso único, observação, liberação, confirmação, autorização de negócio, preservação de recorrências, falhas e deduplicação. Os testes usam regras puras e adaptador em memória; não enviam e-mail nem modificam reservas reais.

`npm run test:iot:postgres` é opcional e exige acesso ao PostgreSQL. Cria um schema temporário exclusivo, testa concorrência real, confirmação, no-show, disponibilidade e deduplicação e remove somente esse schema ao terminar. Não envia e-mails. Não reutiliza as migrações antigas, pois algumas têm referências explícitas ao schema `public`.

Teste físico: configure uma sala em observação antes do início de uma reserva de teste, aguarde aquecimento, verifique heartbeat, teste aviso sem movimento, confirmação manual, movimento durante a janela e desconexão do ESP32. Desligar o sensor deve resultar em **inconclusivo**, preservando a reserva. Teste e-mail com destinatário controlado. Só habilite automação depois de validar esses cenários.

Referências: [PubSubClient](https://pubsubclient.knolleary.net/api), [MQTT Last Will](https://www.hivemq.com/blog/mqtt-essentials-part-9-last-will-and-testament/) e [idempotência Resend](https://resend.com/changelog/idempotency-keys).
