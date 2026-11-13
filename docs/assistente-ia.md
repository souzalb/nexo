# Nexo AI

## Recuperação de indisponibilidade

No diagnóstico de 11/11/2026, os modelos 3.8 e 3.7 retornaram HTTP 504. O ambiente local passou a usar `GEMINI_MODEL=gemini-3.1-flash-lite`, que respondeu ao teste de texto e ao ciclo de ferramenta com dados sintéticos. Reinicie o servidor para carregar alterações de ambiente. Essa verificação não cria reservas e não garante disponibilidade futura do provedor.

HTTP 504, erros transitórios de servidor e abortos por timeout agora acionam alternativas. Falhas são classificadas sem registrar chave, conteúdo da conversa ou mensagens brutas do provedor. A interface diferencia timeout, cota, acesso recusado e indisponibilidade. Testes: `node --test tests/ai-assistant.test.cjs tests/ai-assistant-route.test.cjs tests/ai-provider-errors.test.cjs`. Teste externo de ferramentas: `node scripts/check-ai-assistant.cjs --tools`.

O assistente consulta salas, recursos, compatibilidade, disponibilidade e as próximas reservas do próprio usuário. As respostas usam o horário de São Paulo. O modelo é configurado por `GEMINI_MODEL`, com padrão `gemini-3.1-flash-lite`; alternativas padrão são `gemini-3.7-flash` e `gemini-3.5-flash`, substituíveis em `GEMINI_FALLBACK_MODELS`, separadas por vírgula. A chave permanece apenas no servidor.

## Fluxo de reserva

1. O usuário informa turma, sala, datas, horários e dias da semana.
2. A ferramenta `preparar_reserva` valida os parâmetros e consulta a disponibilidade.
3. A resposta inclui um cartão de revisão. A rota da IA não grava reservas nem solicitações.
4. Somente ao clicar no cartão, a interface chama a API existente: `/api/bookings` para administrador ou `/api/booking-requests` para os demais perfis. Essas APIs mantêm suas regras de autorização e negócio.
5. O sucesso é apresentado a partir da resposta da API. Em resultado incerto, não há repetição automática da gravação: o usuário deve conferir sua área de reservas/solicitações.

Há bloqueio de cliques simultâneos na interface; isso não equivale a idempotência distribuída das APIs existentes. O histórico permanece em memória no componente e é descartado ao recarregar, sair da sessão ou iniciar nova conversa. O limite é de 40 mensagens e 60 mil caracteres enviados por consulta; históricos longos exigem nova conversa.

## Interface e segurança

O tipo de ambiente é filtrado por igualdade, antes do cálculo de compatibilidade. “Laboratório de Informática” é uma categoria distinta de “Laboratório”. Pedidos explícitos de informática são preservados nas alternativas a partir das mensagens do usuário; nomes de ambientes sugeridos pelo assistente não criam esse requisito. Um nome usado indevidamente como categoria é normalizado para o tipo. Sem outras salas do tipo solicitado, a busca retorna vazia em vez de ampliar silenciosamente a categoria.

A busca aceita qualquer quantidade válida de participantes como capacidade mínima, localização e tipo explicitamente exigidos, recursos obrigatórios e uma janela completa de disponibilidade. Com datas e blocos definidos, conflitos são filtrados no banco antes do cálculo de compatibilidade. As alternativas preservam esses critérios e retiram o nome da sala sugerida. Nomes de recursos são normalizados quanto a acentos, espaços e hífens; correspondência parcial é aceita apenas quando identifica um único item do catálogo. Critérios ambíguos devem ser esclarecidos, não removidos silenciosamente. Preferências opcionais ainda são tratadas na conversa; não há novos pesos específicos para elas no índice de compatibilidade.

Janela responsiva e acessível com controle de foco, sugestões iniciais, cartões de salas, ações de revisão, nova conversa e recuperação de falhas. Texto é renderizado por React, sem HTML arbitrário. As ferramentas validam datas reais, intervalo de até 366 dias, dias da semana e sobreposição dos blocos. Conteúdos do cliente não podem assumir o papel system. Isso complementa, mas não substitui, autorização nas APIs de gravação.

Recomendações usam os mesmos pesos do módulo de compatibilidade: capacidade 40%, distribuição de uso 35%, recursos 25%. A busca considera nomes de recursos cadastrados e apresenta inicialmente apenas a sala com maior compatibilidade. Até oito opções são exibidas quando o usuário pede alternativas ou comparação. Salas descartadas por conflito ou rejeitadas podem ser excluídas antes de selecionar a próxima melhor opção. Compatibilidade não implica disponibilidade; a consulta de horários é separada. Se um recurso não for encontrado, o assistente pode consultar o catálogo de recursos.

O horário noturno na API de reservas termina às 22h30 (01h30 UTC do dia seguinte). As instruções e o cartão do assistente refletem esse cálculo. Alguns textos antigos de outras telas indicam 21h30; essa divergência deve ser alinhada com a regra institucional antes de alterar os horários da aplicação inteira.

## Verificação

- `node --test tests/ai-assistant.test.cjs tests/ai-assistant-route.test.cjs`: datas, limites, horários e proposta sem gravação, usando dependências simuladas.
- `node scripts/check-ai-assistant.cjs`: uma chamada curta ao provedor, sem dados de usuários e sem banco.
- Teste manual: peça uma sala para 25 alunos com projetor, informe data/turma, revise o cartão e teste ajustar os dados. Envie uma reserva somente com uma conta e um horário destinados a teste.

Os nomes padrão foram confirmados na listagem da API com a chave local. O teste inicial retornou indisponibilidade/timeout; a recuperação descrita acima confirmou geração e chamada de ferramenta no modelo alternativo. O fluxo visual completo ainda precisa de validação na sessão do usuário. Consulte os modelos disponíveis com `node scripts/check-ai-assistant.cjs --list`.
