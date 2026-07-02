import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../state.js';
import { PLANET_TYPES } from '../data.js';

test('createInitialState returns turn 1, 5 planets, one owned by player', () => {
  const state = createInitialState();
  assert.equal(state.turn, 1);
  assert.equal(state.planets.length, 5);

  const owned = state.planets.filter((p) => p.owner === 'player');
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, 'sol-prime');
  assert.equal(owned[0].population, 5);
  assert.equal(owned[0].maxPopulation, 20);

  const unowned = state.planets.filter((p) => p.owner === null);
  assert.equal(unowned.length, 4);
  for (const planet of unowned) {
    assert.equal(planet.population, 0);
  }
});

test('every planet has a valid typeKey and zeroed buildings/buildQueue', () => {
  const state = createInitialState();
  for (const planet of state.planets) {
    assert.ok(PLANET_TYPES[planet.typeKey], `${planet.typeKey} must exist in PLANET_TYPES`);
    assert.deepEqual(planet.buildings, { farm: 0, factory: 0, lab: 0 });
    assert.equal(planet.buildQueue, null);
  }
});

test('research and colony ship pool start empty', () => {
  const state = createInitialState();
  assert.deepEqual(state.research, { completedTechIds: [], currentTechId: null, progress: 0 });
  assert.equal(state.unassignedColonyShips, 0);
});

test('createInitialState returns a fresh object each call (no shared references)', () => {
  const a = createInitialState();
  const b = createInitialState();
  a.planets[0].population = 999;
  assert.equal(b.planets[0].population, 5);
});
