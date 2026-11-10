# Monitoramento por sala

No painel administrativo, abra **Monitoramento ESP32** (`/mqtt`).

1. Busque o nome da sala ou filtre entre salas com e sem sensor.
2. Selecione a sala na lista. O cabeçalho identifica o ambiente exibido, mesmo quando a busca oculta seu item na lista.
3. Em **Sensor ao vivo**, consulte a última leitura, a conexão, a assinatura e o histórico. O filtro do histórico não altera a coleta.
4. Em **Reservas e ocorrências**, veja apenas os registros da sala selecionada.
5. Em **Configurações**, associe o dispositivo e seu tópico e ajuste os tempos de alerta e decisão. Salve para aplicar.

Cada sala deve ter seu próprio tópico MQTT. O receptor consulta o tópico cadastrado da sala no broker definido por `ESP32_MQTT_URL`. Todos os sensores desta tela devem publicar nesse mesmo broker. A BS-10 continua compatível com `salas/b10/movimento` e com as mensagens `DETECTADO` e `PARADO` do sketch original.

As assinaturas são abertas ao consultar uma sala. Monitores de tópicos adicionais são compartilhados entre administradores no mesmo processo e encerrados após 15 minutos sem consultas, com limite de 50 monitores adicionais ativos. O receptor padrão continua ativo. Cada monitor mantém as últimas 100 mensagens em memória; encerrar o monitor ou reiniciar o servidor apaga esse histórico. Não há captura retroativa de mensagens enviadas antes da assinatura.

O estado da conexão se refere ao servidor e ao broker. O sketch original publica somente mudanças e não permite concluir se o ESP32 está online pelo silêncio. Uma leitura PARADO também não comprova que a sala esteja vazia. As configurações de no-show continuam dependentes do coletor de telemetria contínua; esta interface não muda os critérios de liberação de reservas.
