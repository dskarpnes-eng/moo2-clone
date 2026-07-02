import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANET_TYPES,
  BUILDING_TYPES,
  BUILDING_DEFS,
  TECH_TREE,
  COLONY_SHIP_COST,
  BASE_PRODUCTION_PER_POP,
  BASE_RESEARCH_PER_POP,
  BASE_GROWTH_FRACTION,
  STARTING_COLONY_POPULATION,
} from '../data.js';

test('TECH_TREE has exactly 9 unique techs unlocking every building tier once', () => {
  assert.equal(TECH_TREE.length, 9);
  const ids = TECH_TREE.map((t) => t.id);
  assert.equal(new Set(ids).size, 9, 'tech ids must be unique');

  for (const tech of TECH_TREE) {
    assert.equal(typeof tech.name, 'string');
    assert.ok(tech.cost > 0);
    assert.ok(BUILDING_TYPES.includes(tech.unlocks.building));
    assert.ok(tech.unlocks.tier >= 1 && tech.unlocks.tier <= 3);
  }

  for (const building of BUILDING_TYPES) {
    const tiersUnlocked = TECH_TREE
      .filter((t) => t.unlocks.building === building)
      .map((t) => t.unlocks.tier)
      .sort();
    assert.deepEqual(tiersUnlocked, [1, 2, 3], `${building} must have tiers 1-3 unlocked exactly once each`);
  }
});

test('BUILDING_DEFS has 3 costed tiers for every building type', () => {
  for (const building of BUILDING_TYPES) {
    assert.equal(BUILDING_DEFS[building].tiers.length, 3);
    for (const tier of BUILDING_DEFS[building].tiers) {
      assert.ok(tier.cost > 0);
    }
  }
});

test('PLANET_TYPES all have a growthModifier between 0 and 1', () => {
  for (const key of Object.keys(PLANET_TYPES)) {
    const type = PLANET_TYPES[key];
    assert.equal(typeof type.label, 'string');
    assert.ok(type.growthModifier > 0 && type.growthModifier <= 1);
  }
});

test('base constants are sane positive numbers', () => {
  assert.ok(COLONY_SHIP_COST > 0);
  assert.ok(BASE_PRODUCTION_PER_POP > 0);
  assert.ok(BASE_RESEARCH_PER_POP > 0);
  assert.ok(BASE_GROWTH_FRACTION > 0 && BASE_GROWTH_FRACTION < 1);
  assert.ok(STARTING_COLONY_POPULATION > 0);
});
