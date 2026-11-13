const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  recommendAssistantRooms,
} = require('../src/app/_lib/room-recommendation.ts');
const {
  roomSearchSchema,
} = require('../src/app/_lib/ai-assistant-contract.ts');
const rooms = [
  {
    id: 'large',
    capacity: 80,
    occupancy: 10,
    resources: [{ id: 'projector' }, { id: 'extra' }],
  },
  { id: 'best', capacity: 40, occupancy: 20, resources: [{ id: 'projector' }] },
  { id: 'busy', capacity: 30, occupancy: 70, resources: [{ id: 'projector' }] },
  { id: 'incompatible', capacity: 20, occupancy: 0, resources: [] },
];
const criteria = { students: 28, requiredResourceIds: ['projector'] };
test('minimum capacity and ranking work for arbitrary group sizes', () => {
  for (const students of [8, 17, 35, 57, 120]) {
    const choices = [students - 1, students, students + 10, students * 2].map(
      (capacity, index) => ({
        id: String(index),
        capacity,
        occupancy: 0,
        resources: [],
      }),
    );
    const selected = recommendAssistantRooms(
      choices,
      { students },
      { alternatives: true },
    );
    assert.equal(selected.length, 3);
    assert.ok(selected.every((room) => room.capacity >= students));
    assert.equal(selected[0].capacity, students);
  }
});
test('assistant returns only the highest compatibility by default', () => {
  const result = recommendAssistantRooms(rooms, criteria);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'best');
  assert.equal(result[0].recommendation.score, 93);
  assert.equal(
    roomSearchSchema.parse({ alunos: 28 }).mostrar_alternativas,
    false,
  );
});
test('explicit alternatives preserve ranking and exclude incompatible rooms', () => {
  const result = recommendAssistantRooms(rooms, criteria, {
    alternatives: true,
  });
  assert.equal(result.length, 3);
  assert.equal(result[0].id, 'best');
  assert.ok(
    result.every(
      (room, index) =>
        index === 0 ||
        result[index - 1].recommendation.score >= room.recommendation.score,
    ),
  );
});
test('conflicting or rejected rooms can be excluded before selecting next best', () => {
  const result = recommendAssistantRooms(rooms, criteria, {
    excludedIds: ['best'],
  });
  assert.equal(result.length, 1);
  assert.notEqual(result[0].id, 'best');
  assert.deepEqual(
    recommendAssistantRooms(rooms, criteria, {
      excludedIds: ['best', 'busy', 'large'],
    }),
    [],
  );
});
