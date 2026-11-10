# Sketch com heartbeat para Arduino IDE

1. Abra `esp32-pir-heartbeat.ino` na Arduino IDE.
2. Preencha `ssid` e `password` com os dados do Wi-Fi. Não publique o arquivo preenchido em repositórios.
3. Selecione sua placa ESP32 e porta USB. Instale a biblioteca PubSubClient se necessário.
4. Envie o sketch e abra o Monitor Serial em 115200 baud. PIR no GPIO 14.
5. Aguarde os 60 segundos de estabilização. As amostras anteriores têm `ready: false`.
6. No Nexo, selecione BS-10 → Sensor ao vivo. Sem movimento, deve chegar uma amostra JSON aproximadamente a cada 30 segundos. Ao movimentar-se, devem aparecer `DETECTADO` e uma amostra JSON; ao baixar a saída do PIR, `PARADO` e outra amostra.

Broker: `broker.hivemq.com:1883`; tópico: `salas/b10/movimento`; dispositivo: `esp32-b10`. A amostra inicial é enviada também após reconexão. `online` / `offline` são publicados no tópico `/status` (offline depende da detecção de queda pelo broker, não é instantâneo). Publicação QoS 0 confirma envio local, não recebimento pelo servidor.

As mensagens de texto foram preservadas. O JSON usa o formato já aceito pelo receptor e pelo coletor do Nexo, com identificação da inicialização, sequência, estado, aquecimento e tempo desde o último movimento. Não exige ArduinoJson nem arquivo config.h.

O sensor não conhece as reservas e mantém o heartbeat durante todo o dia. O servidor só considera evidências de uso nos primeiros 30 minutos de cada reserva (13h–13h30, por exemplo), sem usar movimento anterior ao início. Depois disso não confirma uso por PIR nem libera automaticamente; uma avaliação não concluída fica inconclusiva. Alertas atrasados não podem estender a janela nem encurtar o intervalo de resposta. Para reduzir a chance de o ciclo de avaliação perder o limite, configure a decisão antes do minuto 30.

Este passo prepara e permite observar o heartbeat; não habilita liberação automática. O coletor de reservas deve estar configurado para o mesmo broker do dispositivo para ingerir as amostras. O receptor de diagnóstico utiliza ESP32_MQTT_URL; o coletor utiliza MQTT_URL. Não alteramos essas configurações locais nesta etapa.
