import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBuildQueue } from '../logic.js';

function basePlanet(overrides = {}) {
  return {
    id: 'p1',
    name: 'Test',
    typeKey: 'terran',
    maxPopulation: 20,
    owner: 'player',
    population: 10,
    buildings: { farm: 0, factory: 0, lab: 0 },
    buildQueue: null,
    ...overrides,
  };
}

test('planet with empty queue is unchanged', () => {
  const planet = basePlanet();
  const result = resolveBuildQueue(planet, 10);
  assert.equal(result.completed, null);
  assert.equal(result.planet.buildQueue, null);
});

test('colony ship in progress accumulates production without completing', () => {
  const planet = basePlanet({ buildQueue: { kind: 'colonyShip', progress: 0 } });
  const result = resolveBuildQueue(planet, 40); // COLONY_SHIP_COST is 100
  assert.equal(result.completed, null);
  assert.deepEqual(result.planet.buildQueue, { kind: 'colonyShip', progress: 40 });
});

test('colony ship completes when progress reaches cost, clearing the queue', () => {
  const planet = basePlanet({ buildQueue: { kind: 'colonyShip', progress: 80 } });
  const result = resolveBuildQueue(planet, 30);
  assert.deepEqual(result.completed, { kind: 'colonyShip' });
  assert.equal(result.planet.buildQueue, null);
});

test('building completes, sets the building tier, and clears the queue', () => {
  const planet = basePlanet({ buildQueue: { kind: 'building', building: 'farm', tier: 1, progress: 50 } });
  const result = resolveBuildQueue(planet, 20); // farm tier 1 cost is 60
  assert.deepEqual(result.completed, { kind: 'building', building: 'farm', tier: 1 });
  assert.equal(result.planet.buildQueue, null);
  assert.equal(result.planet.buildings.farm, 1);
});

test('resolveBuildQueue does not mutate the input planet', () => {
  const planet = basePlanet({ buildQueue: { kind: 'colonyShip', progress: 0 } });
  const frozen = JSON.parse(JSON.stringify(planet));
  resolveBuildQueue(planet, 40);
  assert.deepEqual(planet, frozen);
});
