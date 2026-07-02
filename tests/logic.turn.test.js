import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTurn, colonizePlanet, tryQueueBuild } from '../logic.js';
import { createInitialState } from '../state.js';

test('resolveTurn increments the turn counter', () => {
  const state = createInitialState();
  const result = resolveTurn(state);
  assert.equal(result.turn, 2);
});

test('resolveTurn grows the owned planet and leaves unowned planets at 0', () => {
  const state = createInitialState();
  const result = resolveTurn(state);
  const home = result.planets.find((p) => p.id === 'sol-prime');
  assert.ok(home.population > 5);
  const unowned = result.planets.filter((p) => p.owner === null);
  for (const planet of unowned) {
    assert.equal(planet.population, 0);
  }
});

test('resolveTurn does not accumulate research when no tech is selected', () => {
  const state = createInitialState();
  const result = resolveTurn(state);
  assert.equal(result.research.progress, 0);
  assert.equal(result.research.currentTechId, null);
});

test('resolveTurn accumulates research when a tech is selected', () => {
  let state = createInitialState();
  state = { ...state, research: { ...state.research, currentTechId: 'farming' } };
  const result = resolveTurn(state);
  // home planet population 5 -> research output 5 * 0.5 = 2.5
  assert.equal(result.research.progress, 2.5);
});

test('resolveTurn completes a queued colony ship and adds it to the unassigned pool', () => {
  let state = createInitialState();
  const home = state.planets.find((p) => p.id === 'sol-prime');
  home.buildQueue = { kind: 'colonyShip', progress: 95 }; // home planet production is 5/turn, enough to finish
  const result = resolveTurn(state);
  assert.equal(result.unassignedColonyShips, 1);
  const updatedHome = result.planets.find((p) => p.id === 'sol-prime');
  assert.equal(updatedHome.buildQueue, null);
});

test('resolveTurn does not mutate the input state', () => {
  const state = createInitialState();
  const frozen = JSON.parse(JSON.stringify(state));
  resolveTurn(state);
  assert.deepEqual(state, frozen);
});

test('colonizePlanet is a no-op with zero unassigned colony ships', () => {
  const state = createInitialState();
  const result = colonizePlanet(state, 'sol-ii');
  assert.deepEqual(result, state);
});

test('colonizePlanet claims an unowned planet and consumes a colony ship', () => {
  const state = { ...createInitialState(), unassignedColonyShips: 1 };
  const result = colonizePlanet(state, 'sol-ii');
  assert.equal(result.unassignedColonyShips, 0);
  const solII = result.planets.find((p) => p.id === 'sol-ii');
  assert.equal(solII.owner, 'player');
  assert.equal(solII.population, 2); // STARTING_COLONY_POPULATION
});

test('colonizePlanet is a no-op if the target is already owned', () => {
  const state = { ...createInitialState(), unassignedColonyShips: 1 };
  const result = colonizePlanet(state, 'sol-prime');
  assert.deepEqual(result, state);
});

test('tryQueueBuild queues a colony ship on an owned planet with an empty queue', () => {
  const state = createInitialState();
  const result = tryQueueBuild(state, 'sol-prime', { kind: 'colonyShip' });
  const home = result.planets.find((p) => p.id === 'sol-prime');
  assert.deepEqual(home.buildQueue, { kind: 'colonyShip', progress: 0 });
});

test('tryQueueBuild refuses a building order without the unlocking tech researched', () => {
  const state = createInitialState();
  const result = tryQueueBuild(state, 'sol-prime', { kind: 'building', building: 'farm', tier: 1 });
  assert.deepEqual(result, state);
});

test('tryQueueBuild allows a building order once its tech is completed', () => {
  let state = createInitialState();
  state = { ...state, research: { ...state.research, completedTechIds: ['farming'] } };
  const result = tryQueueBuild(state, 'sol-prime', { kind: 'building', building: 'farm', tier: 1 });
  const home = result.planets.find((p) => p.id === 'sol-prime');
  assert.deepEqual(home.buildQueue, { kind: 'building', building: 'farm', tier: 1, progress: 0 });
});

test('tryQueueBuild refuses a non-empty queue', () => {
  let state = createInitialState();
  const home = state.planets.find((p) => p.id === 'sol-prime');
  home.buildQueue = { kind: 'colonyShip', progress: 10 };
  const result = tryQueueBuild(state, 'sol-prime', { kind: 'colonyShip' });
  assert.deepEqual(result, state);
});

test('tryQueueBuild refuses orders on unowned planets', () => {
  const state = createInitialState();
  const result = tryQueueBuild(state, 'sol-ii', { kind: 'colonyShip' });
  assert.deepEqual(result, state);
});
