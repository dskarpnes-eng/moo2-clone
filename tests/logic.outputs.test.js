import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlanetOutputs, growPlanet } from '../logic.js';

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

test('unowned planet produces nothing', () => {
  const planet = basePlanet({ owner: null, population: 0 });
  assert.deepEqual(getPlanetOutputs(planet), { production: 0, research: 0 });
});

test('owned planet with no buildings produces base output per population', () => {
  const planet = basePlanet({ population: 10 });
  assert.deepEqual(getPlanetOutputs(planet), { production: 10, research: 5 });
});

test('factory and lab tiers add flat bonuses on top of base output', () => {
  const planet = basePlanet({ population: 10, buildings: { farm: 0, factory: 2, lab: 1 } });
  // factory tier 2 -> productionBonus 4, lab tier 1 -> researchBonus 2
  assert.deepEqual(getPlanetOutputs(planet), { production: 14, research: 7 });
});

test('unowned planet does not grow', () => {
  const planet = basePlanet({ owner: null, population: 0 });
  assert.equal(growPlanet(planet), 0);
});

test('owned planet grows toward maxPopulation without a farm', () => {
  const planet = basePlanet({ population: 10, maxPopulation: 20 });
  // rate = 0.1 * growthModifier(1.0) * (1 + 0) = 0.1; growth = (20-10)*0.1 = 1
  assert.equal(growPlanet(planet), 11);
});

test('farm tier increases growth rate', () => {
  const planet = basePlanet({ population: 10, maxPopulation: 20, buildings: { farm: 1, factory: 0, lab: 0 } });
  // farm tier 1 -> growthBonus 0.5; rate = 0.1 * 1.0 * 1.5 = 0.15; growth = (20-10)*0.15 = 1.5
  assert.equal(growPlanet(planet), 11.5);
});

test('growth never exceeds maxPopulation', () => {
  const planet = basePlanet({ population: 19.98, maxPopulation: 20 });
  assert.ok(growPlanet(planet) <= 20);
});

test('growPlanet does not mutate the input planet', () => {
  const planet = basePlanet({ population: 10 });
  const frozen = JSON.parse(JSON.stringify(planet));
  growPlanet(planet);
  assert.deepEqual(planet, frozen);
});
