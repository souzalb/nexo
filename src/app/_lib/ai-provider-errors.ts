export function classifyAiError(error: unknown) {
  const value =
    error && typeof error === 'object'
      ? (error as {
          status?: unknown;
          code?: unknown;
          name?: unknown;
          message?: unknown;
        })
      : {};
  const message = typeof value.message === 'string' ? value.message : '';
  const numeric = Number(value.status ?? value.code);
  const status =
    Number.isInteger(numeric) && numeric >= 400 && numeric <= 599
      ? numeric
      : Number(
          message.match(/(?:"code"\s*:\s*|\bstatus\s*[:=]?\s*)(\d{3})/i)?.[1],
        ) || undefined;
  const timeout =
    status === 504 ||
    numeric === 20 ||
    ['AbortError', 'TimeoutError'].includes(String(value.name)) ||
    /timeout|timed out|aborted|tempo de resposta excedido/i.test(message);
  const network = /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|network/i.test(
    message,
  );
  const unavailable =
    status === 404 ||
    (status !== undefined && status >= 500) ||
    /modelos.*indisponíveis/i.test(message);
  return {
    status,
    category: timeout
      ? 'timeout'
      : status === 429
        ? 'quota'
        : network
          ? 'network'
          : unavailable
            ? 'unavailable'
            : status === 401 || status === 403
              ? 'credentials'
              : 'unexpected',
    retryable: timeout || network || unavailable || status === 429,
  };
}

export function aiErrorResponse(error: unknown) {
  const { category } = classifyAiError(error);
  if (category === 'timeout')
    return {
      status: 504,
      message:
        'O provedor de IA demorou para responder. Nenhuma reserva foi enviada por esta consulta. Tente novamente em instantes.',
    };
  if (category === 'quota')
    return {
      status: 429,
      message:
        'O limite de uso do provedor de IA foi atingido. Aguarde e tente novamente; se persistir, o administrador deve verificar a cota.',
    };
  if (category === 'credentials')
    return {
      status: 503,
      message:
        'O provedor recusou o acesso do assistente. Peça ao administrador para verificar a chave e as permissões da IA.',
    };
  if (category === 'network' || category === 'unavailable')
    return {
      status: 503,
      message:
        'O provedor de IA está indisponível no momento. Tente novamente em instantes ou use Explorar salas.',
    };
  return {
    status: 500,
    message:
      'Não foi possível concluir a consulta do assistente. Tente uma nova conversa; se persistir, informe ao administrador.',
  };
}
