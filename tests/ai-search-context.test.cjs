const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  alternativeSearch,
  preserveRoomType,
  canonicalRoomType,
  isSimpleAlternativeRequest,
} = require('../src/app/_lib/ai-search-context.ts');
const {
  resolveRequestedResources,
} = require('../src/app/_lib/ai-search-context.ts');
const {
  roomSearchSchema,
} = require('../src/app/_lib/ai-assistant-contract.ts');

test('informatics remains a required type in first search and subsequent alternatives', () => {
  const messages = [
    { role: 'user', content: 'Preciso de informática para 35 alunos' },
    { role: 'assistant', content: 'Sugiro BS-10, Laboratório' },
    { role: 'user', content: 'Mais opções' },
  ];
  const search = preserveRoomType(
    roomSearchSchema.parse({ tipo: 'Laboratório', alunos: 35 }),
    messages,
  );
  assert.equal(search.tipo, 'Laboratório de Informática');
  assert.equal(alternativeSearch(search, ['bs10']).tipo, search.tipo);
  const legacy = alternativeSearch(
    roomSearchSchema.parse({ nome: 'informatica', tipo: 'Laboratório' }),
    [],
  );
  assert.equal(legacy.tipo, 'Laboratório de Informática');
  assert.equal(legacy.nome, undefined);
  assert.equal(canonicalRoomType('laboratorio de informatica'), search.tipo);
  assert.equal(canonicalRoomType('Laboratório'), 'Laboratório');
  const changed = preserveRoomType(search, [
    ...messages,
    { role: 'user', content: 'Agora quero uma sala de aula' },
  ]);
  assert.equal(changed.tipo, 'Sala de Aula');
  const unrequested = preserveRoomType(roomSearchSchema.parse({}), [
    { role: 'assistant', content: 'Informática' },
  ]);
  assert.equal(unrequested.tipo, undefined);
});
test('resource matching tolerates accents and unique partial names but never guesses ambiguity', () => {
  const catalog = [
    { id: 'a', name: 'Projetor multimídia' },
    { id: 'b', name: 'Computadores' },
    { id: 'c', name: 'Ar-condicionado' },
  ];
  assert.deepEqual(
    resolveRequestedResources(catalog, [
      'projetor',
      'computador',
      'ar condicionado',
    ]).resources.map((resource) => resource.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    resolveRequestedResources(
      [...catalog, { id: 'd', name: 'Projetor portátil' }],
      ['projetor'],
    ).unresolved,
    ['projetor'],
  );
  assert.deepEqual(
    resolveRequestedResources(catalog, ['câmera']).resources,
    [],
  );
});
test('search preserves complete schedule and rejects incomplete or invalid windows', () => {
  const criteria = {
    alunos: 37,
    localizacao: 'Bloco B',
    start_date: '2026-11-12',
    end_date: '2026-11-12',
    time_slots: ['TARDE_PRIMEIRO'],
    mostrar_alternativas: false,
  };
  const parsed = roomSearchSchema.parse(criteria);
  const next = alternativeSearch(parsed, ['old']);
  assert.equal(next.alunos, 37);
  assert.equal(next.localizacao, 'Bloco B');
  assert.deepEqual(next.time_slots, ['TARDE_PRIMEIRO']);
  assert.equal(next.start_date, criteria.start_date);
  assert.equal(
    roomSearchSchema.safeParse({ alunos: 37, start_date: '2026-11-12' })
      .success,
    false,
  );
  assert.equal(
    roomSearchSchema.safeParse({ ...criteria, end_date: '2026-11-10' }).success,
    false,
  );
});
test('alternatives broaden name but preserve minimum size and required resources', () => {
  const result = alternativeSearch(
    {
      nome: 'BS-10',
      alunos: 20,
      capacidade_minima: 20,
      recursos: ['Projetor'],
      mostrar_alternativas: false,
      excluir_salas: ['old'],
    },
    ['first'],
  );
  assert.equal(result.nome, undefined);
  assert.equal(result.alunos, 20);
  assert.deepEqual(result.recursos, ['Projetor']);
  assert.deepEqual(result.excluir_salas, ['old', 'first']);
  assert.equal(result.mostrar_alternativas, true);
});
test('simple alternatives use retained criteria but requests with new criteria go to model', () => {
  for (const text of [
    'Tem outras opções?',
    'quero outras salas',
    'mais opções',
    'outra sala',
  ])
    assert.equal(isSimpleAlternativeRequest(text), true);
  for (const text of [
    'outras salas para 30 alunos',
    'outra sala com computadores',
    'não quero outras opções',
  ])
    assert.equal(isSimpleAlternativeRequest(text), false);
});
