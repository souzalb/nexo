import { roomSearchSchema } from './ai-assistant-contract';
import { z } from 'zod';
export type AssistantSearch = z.infer<typeof roomSearchSchema>;
const roomTypes = [
  'Laboratório de Informática',
  'Laboratório',
  'Sala de Aula',
  'Auditório',
];
const normalizeResource = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function canonicalRoomType(value: string) {
  const normalized = normalizeResource(value);
  if (/^(?:laboratorios? (?:de )?)?informatica$/.test(normalized))
    return 'Laboratório de Informática';
  return (
    roomTypes.find((type) => normalizeResource(type) === normalized) || value
  );
}

// Recover explicit requirements from user messages, never from suggested rooms.
// This also repairs chats created before the type was consistently retained.
export function preserveRoomType(
  search: AssistantSearch,
  messages: { role: string; content: string }[],
): AssistantSearch {
  let tipo = search.tipo ? canonicalRoomType(search.tipo) : undefined;
  for (const message of [...messages].reverse()) {
    if (message.role !== 'user') continue;
    const text = normalizeResource(message.content);
    // Leave negations/type changes to the model rather than inferring a positive requirement.
    if (/\b(?:nao|sem|qualquer|tanto faz)\b/.test(text)) break;
    if (/\binformatica\b/.test(text)) {
      tipo = 'Laboratório de Informática';
      break;
    }
    if (/\bsalas? de aula\b/.test(text)) {
      tipo = 'Sala de Aula';
      break;
    }
    if (/\bauditorios?\b/.test(text)) {
      tipo = 'Auditório';
      break;
    }
    if (/\b(?:quero|preciso|busco|prefiro)\b.*\blaboratorio\b/.test(text))
      break;
  }
  const nameIsType =
    !!search.nome && roomTypes.includes(canonicalRoomType(search.nome));
  if (nameIsType && (!tipo || tipo === 'Laboratório'))
    tipo = canonicalRoomType(search.nome!);
  return { ...search, tipo, nome: nameIsType ? undefined : search.nome };
}
export function resolveRequestedResources<
  T extends { id: string; name: string },
>(catalog: T[], requested: string[]) {
  const matched = new Map<string, T>();
  const unresolved: string[] = [];
  for (const request of requested) {
    const normalized = normalizeResource(request);
    const exact = catalog.filter(
      (resource) => normalizeResource(resource.name) === normalized,
    );
    const options = exact.length
      ? exact
      : catalog.filter((resource) =>
          normalized.split(' ').every((word) =>
            normalizeResource(resource.name)
              .split(' ')
              .some(
                (token) =>
                  token === word ||
                  (word.length >= 4 && token.startsWith(word)),
              ),
          ),
        );
    if (options.length === 1) matched.set(options[0].id, options[0]);
    else unresolved.push(request);
  }
  return { resources: [...matched.values()], unresolved };
}
export function alternativeSearch(previous: AssistantSearch, shown: string[]) {
  return roomSearchSchema.parse({
    ...preserveRoomType(previous, []),
    nome: undefined,
    mostrar_alternativas: true,
    excluir_salas: [
      ...new Set([...(previous.excluir_salas || []), ...shown]),
    ].slice(-100),
  });
}
export function isSimpleAlternativeRequest(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[?!.]+$/g, '');
  return /^(?:(?:tem|ha|quais|quero|mostre|me mostre|pode mostrar|me de|e|existem)\s+)?(?:outras? (?:opcao|opcoes|salas?|alternativas?)|alternativas|mais opcoes)(?:\s+(?:de salas|disponiveis|por favor|tem|existem))?$/.test(
    normalized,
  );
}
