# MOO2 Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-playable, single-star-system colonization/growth/research loop (MOO2 v0), per `docs/superpowers/specs/2026-07-02-moo2-core-loop-design.md`.

**Architecture:** Vanilla HTML/CSS/JS, no build step, no framework. Game logic is a set of pure functions (`data.js`, `state.js`, `logic.js`) that never touch the DOM, so they can be unit-tested headlessly with Node's built-in test runner. `render.js` and `persistence.js` are the only modules that touch the DOM / `localStorage`, wired together by `game.js`. State flows one-way: an action produces a new state object, `game.js` re-renders from it and saves it.

**Tech Stack:** Vanilla JS (ES modules), HTML, CSS. Node's built-in `node:test` + `node:assert/strict` for unit tests (Node v18+; this machine runs v26.4.0) — no npm dependencies.

## Global Constraints

- No build step, no framework, no npm dependencies — plain ES modules loaded via `<script type="module">` and by Node directly.
- Game logic (`data.js`, `state.js`, `logic.js`) must be pure functions with no DOM or `localStorage` access, so `node --test` can run them without a browser.
- State is never mutated in place — every logic function returns a new object.
- Persist full game state to `localStorage` after every turn resolution and after every player action that changes state.
- Single linear tech track (8 fixed techs), single buildable ship type (Colony Ship), single star system (5 planets), no combat/diplomacy/AI — exactly as scoped in the design doc.

---

### Task 1: Static game data (`data.js`)

**Files:**
- Create: `data.js`
- Test: `tests/data.test.js`

**Interfaces:**
- Produces:
  - `PLANET_TYPES`: `{ [typeKey: string]: { label: string, growthModifier: number } }`
  - `BUILDING_TYPES`: `string[]` — `['farm', 'factory', 'lab']`
  - `BUILDING_DEFS`: `{ [buildingKey: string]: { tiers: { growthBonus?: number, productionBonus?: number, researchBonus?: number, cost: number }[] } }` (tiers array is 0-indexed; tier N in game terms = `tiers[N-1]`)
  - `TECH_TREE`: `{ id: string, name: string, cost: number, unlocks: { building: string, tier: number } }[]` — exactly 9 entries, in research order (each of `farm`, `factory`, `lab` gets tiers 1-3 unlocked exactly once)
  - `COLONY_SHIP_COST`: `number` = `100`
  - `BASE_PRODUCTION_PER_POP`: `number` = `1`
  - `BASE_RESEARCH_PER_POP`: `number` = `0.5`
  - `BASE_GROWTH_FRACTION`: `number` = `0.1`
  - `STARTING_COLONY_POPULATION`: `number` = `2`

- [ ] **Step 1: Write the failing test**

Create `tests/data.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/data.test.js`
Expected: FAIL — `Cannot find module '../data.js'`

- [ ] **Step 3: Write the implementation**

Create `data.js`:

```js
export const PLANET_TYPES = {
  terran: { label: 'Terran', growthModifier: 1.0 },
  ocean: { label: 'Ocean', growthModifier: 0.9 },
  tundra: { label: 'Tundra', growthModifier: 0.7 },
  desert: { label: 'Desert', growthModifier: 0.6 },
  barren: { label: 'Barren', growthModifier: 0.4 },
};

export const BUILDING_TYPES = ['farm', 'factory', 'lab'];

export const BUILDING_DEFS = {
  farm: {
    tiers: [
      { growthBonus: 0.5, cost: 60 },
      { growthBonus: 1.0, cost: 90 },
      { growthBonus: 1.5, cost: 120 },
    ],
  },
  factory: {
    tiers: [
      { productionBonus: 2, cost: 60 },
      { productionBonus: 4, cost: 90 },
      { productionBonus: 6, cost: 120 },
    ],
  },
  lab: {
    tiers: [
      { researchBonus: 2, cost: 60 },
      { researchBonus: 4, cost: 90 },
      { researchBonus: 6, cost: 120 },
    ],
  },
};

export const TECH_TREE = [
  { id: 'farming', name: 'Farming', cost: 40, unlocks: { building: 'farm', tier: 1 } },
  { id: 'industrialization', name: 'Industrialization', cost: 50, unlocks: { building: 'factory', tier: 1 } },
  { id: 'basicPhysics', name: 'Basic Physics', cost: 60, unlocks: { building: 'lab', tier: 1 } },
  { id: 'selectiveBreeding', name: 'Selective Breeding', cost: 80, unlocks: { building: 'farm', tier: 2 } },
  { id: 'automation', name: 'Automation', cost: 100, unlocks: { building: 'factory', tier: 2 } },
  { id: 'appliedPhysics', name: 'Applied Physics', cost: 120, unlocks: { building: 'lab', tier: 2 } },
  { id: 'advancedFarming', name: 'Advanced Farming', cost: 150, unlocks: { building: 'farm', tier: 3 } },
  { id: 'roboticProduction', name: 'Robotic Production', cost: 180, unlocks: { building: 'factory', tier: 3 } },
  { id: 'quantumPhysics', name: 'Quantum Physics', cost: 200, unlocks: { building: 'lab', tier: 3 } },
];

export const COLONY_SHIP_COST = 100;
export const BASE_PRODUCTION_PER_POP = 1;
export const BASE_RESEARCH_PER_POP = 0.5;
export const BASE_GROWTH_FRACTION = 0.1;
export const STARTING_COLONY_POPULATION = 2;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/data.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add data.js tests/data.test.js
git commit -m "Add static game data: planet types, buildings, tech tree"
```

---

### Task 2: Initial game state (`state.js`)

**Files:**
- Create: `state.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Consumes: `PLANET_TYPES` from `data.js`
- Produces:
  - `createInitialState()` → `GameState`, where:
    ```
    GameState = {
      turn: number,
      planets: Planet[],
      research: { completedTechIds: string[], currentTechId: string|null, progress: number },
      unassignedColonyShips: number,
    }
    Planet = {
      id: string,
      name: string,
      typeKey: string,          // key into PLANET_TYPES
      maxPopulation: number,
      owner: 'player' | null,
      population: number,
      buildings: { farm: number, factory: number, lab: number },  // 0-3, 0 = not built
      buildQueue: null
        | { kind: 'colonyShip', progress: number }
        | { kind: 'building', building: string, tier: number, progress: number },
    }
    ```
  - Home planet id is `'sol-prime'`, owned by `'player'`, population `5`, maxPopulation `20`, typeKey `'terran'`.
  - Four more planets, all unowned: `'sol-ii'` (ocean, maxPop 16), `'sol-iii'` (tundra, maxPop 12), `'sol-iv'` (desert, maxPop 10), `'sol-v'` (barren, maxPop 8).

- [ ] **Step 1: Write the failing test**

Create `tests/state.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/state.test.js`
Expected: FAIL — `Cannot find module '../state.js'`

- [ ] **Step 3: Write the implementation**

Create `state.js`:

```js
function makePlanet({ id, name, typeKey, maxPopulation, owner = null, population = 0 }) {
  return {
    id,
    name,
    typeKey,
    maxPopulation,
    owner,
    population,
    buildings: { farm: 0, factory: 0, lab: 0 },
    buildQueue: null,
  };
}

export function createInitialState() {
  return {
    turn: 1,
    planets: [
      makePlanet({ id: 'sol-prime', name: 'Sol Prime', typeKey: 'terran', maxPopulation: 20, owner: 'player', population: 5 }),
      makePlanet({ id: 'sol-ii', name: 'Sol II', typeKey: 'ocean', maxPopulation: 16 }),
      makePlanet({ id: 'sol-iii', name: 'Sol III', typeKey: 'tundra', maxPopulation: 12 }),
      makePlanet({ id: 'sol-iv', name: 'Sol IV', typeKey: 'desert', maxPopulation: 10 }),
      makePlanet({ id: 'sol-v', name: 'Sol V', typeKey: 'barren', maxPopulation: 8 }),
    ],
    research: { completedTechIds: [], currentTechId: null, progress: 0 },
    unassignedColonyShips: 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/state.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add state.js tests/state.test.js
git commit -m "Add initial game state factory"
```

---

### Task 3: Planet outputs and growth (`logic.js` part 1)

**Files:**
- Create: `logic.js`
- Test: `tests/logic.outputs.test.js`

**Interfaces:**
- Consumes: `PLANET_TYPES`, `BUILDING_DEFS`, `BASE_PRODUCTION_PER_POP`, `BASE_RESEARCH_PER_POP`, `BASE_GROWTH_FRACTION` from `data.js`; `Planet` shape from Task 2.
- Produces:
  - `getPlanetOutputs(planet: Planet) → { production: number, research: number }`
  - `growPlanet(planet: Planet) → number` (new population value; does not mutate `planet`)

- [ ] **Step 1: Write the failing test**

Create `tests/logic.outputs.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/logic.outputs.test.js`
Expected: FAIL — `Cannot find module '../logic.js'`

- [ ] **Step 3: Write the implementation**

Create `logic.js`:

```js
import { PLANET_TYPES, BUILDING_DEFS, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';

function tierBonus(buildingKey, tier, bonusField) {
  if (tier <= 0) return 0;
  return BUILDING_DEFS[buildingKey].tiers[tier - 1][bonusField] ?? 0;
}

export function getPlanetOutputs(planet) {
  if (!planet.owner) {
    return { production: 0, research: 0 };
  }
  const production = planet.population * BASE_PRODUCTION_PER_POP + tierBonus('factory', planet.buildings.factory, 'productionBonus');
  const research = planet.population * BASE_RESEARCH_PER_POP + tierBonus('lab', planet.buildings.lab, 'researchBonus');
  return { production, research };
}

export function growPlanet(planet) {
  if (!planet.owner) {
    return 0;
  }
  const growthModifier = PLANET_TYPES[planet.typeKey].growthModifier;
  const farmBonus = tierBonus('farm', planet.buildings.farm, 'growthBonus');
  const rate = BASE_GROWTH_FRACTION * growthModifier * (1 + farmBonus);
  const grown = planet.population + (planet.maxPopulation - planet.population) * rate;
  return Math.min(grown, planet.maxPopulation);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/logic.outputs.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.outputs.test.js
git commit -m "Add planet output and growth calculations"
```

---

### Task 4: Build queue resolution (`logic.js` part 2)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.buildqueue.test.js`

**Interfaces:**
- Consumes: `BUILDING_DEFS`, `COLONY_SHIP_COST` from `data.js`; `Planet` shape.
- Produces: `resolveBuildQueue(planet: Planet, production: number) → { planet: Planet, completed: null | { kind: 'colonyShip' } | { kind: 'building', building: string, tier: number } }` — does not mutate `planet`.

- [ ] **Step 1: Write the failing test**

Create `tests/logic.buildqueue.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/logic.buildqueue.test.js`
Expected: FAIL — `resolveBuildQueue is not a function` (or similar export error)

- [ ] **Step 3: Write the implementation**

Add to `logic.js` (append; keep the `import` line at the top updated to include `BUILDING_DEFS` and `COLONY_SHIP_COST`, both already imported in Task 3 except `COLONY_SHIP_COST` — add it):

```js
import { PLANET_TYPES, BUILDING_DEFS, COLONY_SHIP_COST, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';
```

```js
function buildQueueCost(queue) {
  if (queue.kind === 'colonyShip') {
    return COLONY_SHIP_COST;
  }
  return BUILDING_DEFS[queue.building].tiers[queue.tier - 1].cost;
}

export function resolveBuildQueue(planet, production) {
  if (!planet.buildQueue) {
    return { planet, completed: null };
  }

  const cost = buildQueueCost(planet.buildQueue);
  const newProgress = planet.buildQueue.progress + production;

  if (newProgress < cost) {
    return {
      planet: { ...planet, buildQueue: { ...planet.buildQueue, progress: newProgress } },
      completed: null,
    };
  }

  if (planet.buildQueue.kind === 'colonyShip') {
    return {
      planet: { ...planet, buildQueue: null },
      completed: { kind: 'colonyShip' },
    };
  }

  const { building, tier } = planet.buildQueue;
  return {
    planet: {
      ...planet,
      buildQueue: null,
      buildings: { ...planet.buildings, [building]: tier },
    },
    completed: { kind: 'building', building, tier },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/logic.buildqueue.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.buildqueue.test.js
git commit -m "Add build queue resolution logic"
```

---

### Task 5: Research progress and tech selection (`logic.js` part 3)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.research.test.js`

**Interfaces:**
- Consumes: `TECH_TREE` from `data.js`; `research` shape from Task 2 (`{ completedTechIds, currentTechId, progress }`).
- Produces:
  - `getNextAvailableTech(research) → Tech | null` (first `TECH_TREE` entry whose `id` is not in `completedTechIds`)
  - `applyResearchProgress(research, points: number) → { research: ResearchState, completedTechId: string | null }`
  - `selectResearch(research, techId: string) → ResearchState` — sets `currentTechId` to `techId` only if `currentTechId` is currently `null` and `techId` matches `getNextAvailableTech(research).id`; otherwise returns `research` unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/logic.research.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextAvailableTech, applyResearchProgress, selectResearch } from '../logic.js';
import { TECH_TREE } from '../data.js';

function baseResearch(overrides = {}) {
  return { completedTechIds: [], currentTechId: null, progress: 0, ...overrides };
}

test('getNextAvailableTech returns the first tech when none completed', () => {
  const tech = getNextAvailableTech(baseResearch());
  assert.equal(tech.id, TECH_TREE[0].id);
});

test('getNextAvailableTech skips completed techs', () => {
  const tech = getNextAvailableTech(baseResearch({ completedTechIds: [TECH_TREE[0].id] }));
  assert.equal(tech.id, TECH_TREE[1].id);
});

test('getNextAvailableTech returns null once all techs are completed', () => {
  const allIds = TECH_TREE.map((t) => t.id);
  assert.equal(getNextAvailableTech(baseResearch({ completedTechIds: allIds })), null);
});

test('applyResearchProgress with no currentTechId does not accumulate', () => {
  const research = baseResearch();
  const result = applyResearchProgress(research, 50);
  assert.equal(result.completedTechId, null);
  assert.deepEqual(result.research, research);
});

test('applyResearchProgress accumulates progress without completing', () => {
  const research = baseResearch({ currentTechId: 'farming', progress: 10 });
  const result = applyResearchProgress(research, 15); // farming costs 40
  assert.equal(result.completedTechId, null);
  assert.equal(result.research.progress, 25);
  assert.equal(result.research.currentTechId, 'farming');
});

test('applyResearchProgress completes a tech, resets progress, and clears currentTechId', () => {
  const research = baseResearch({ currentTechId: 'farming', progress: 30 });
  const result = applyResearchProgress(research, 15); // 30+15=45 >= 40
  assert.equal(result.completedTechId, 'farming');
  assert.deepEqual(result.research, { completedTechIds: ['farming'], currentTechId: null, progress: 0 });
});

test('selectResearch sets currentTechId when valid and empty', () => {
  const research = baseResearch();
  const result = selectResearch(research, 'farming');
  assert.equal(result.currentTechId, 'farming');
});

test('selectResearch is a no-op if currentTechId is already set', () => {
  const research = baseResearch({ currentTechId: 'farming', progress: 5 });
  const result = selectResearch(research, 'industrialization');
  assert.deepEqual(result, research);
});

test('selectResearch is a no-op if techId is not the next available tech', () => {
  const research = baseResearch();
  const result = selectResearch(research, 'industrialization'); // farming is next, not industrialization
  assert.deepEqual(result, research);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/logic.research.test.js`
Expected: FAIL — exports not found

- [ ] **Step 3: Write the implementation**

Add to `logic.js` (update the top import to include `TECH_TREE`):

```js
import { PLANET_TYPES, BUILDING_DEFS, COLONY_SHIP_COST, TECH_TREE, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';
```

```js
export function getNextAvailableTech(research) {
  return TECH_TREE.find((tech) => !research.completedTechIds.includes(tech.id)) ?? null;
}

export function applyResearchProgress(research, points) {
  if (!research.currentTechId) {
    return { research, completedTechId: null };
  }

  const tech = TECH_TREE.find((t) => t.id === research.currentTechId);
  const newProgress = research.progress + points;

  if (newProgress < tech.cost) {
    return { research: { ...research, progress: newProgress }, completedTechId: null };
  }

  return {
    research: {
      completedTechIds: [...research.completedTechIds, tech.id],
      currentTechId: null,
      progress: 0,
    },
    completedTechId: tech.id,
  };
}

export function selectResearch(research, techId) {
  if (research.currentTechId) {
    return research;
  }
  const next = getNextAvailableTech(research);
  if (!next || next.id !== techId) {
    return research;
  }
  return { ...research, currentTechId: techId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/logic.research.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.research.test.js
git commit -m "Add research progress and tech selection logic"
```

---

### Task 6: Turn resolution, colonization, and build queueing (`logic.js` part 4)

**Files:**
- Modify: `logic.js`
- Test: `tests/logic.turn.test.js`

**Interfaces:**
- Consumes: everything from Tasks 3-5 (`getPlanetOutputs`, `growPlanet`, `resolveBuildQueue`, `applyResearchProgress`), plus `STARTING_COLONY_POPULATION` from `data.js`, plus `GameState`/`Planet` shapes from Task 2.
- Produces:
  - `resolveTurn(state: GameState) → GameState` — grows every owned planet, computes outputs, resolves each planet's build queue, sums research across owned planets into `applyResearchProgress`, adds completed colony ships to `unassignedColonyShips`, increments `turn` by 1.
  - `colonizePlanet(state: GameState, planetId: string) → GameState` — if `unassignedColonyShips > 0` and the target planet is unowned, sets it to `owner: 'player'`, `population: STARTING_COLONY_POPULATION`, and decrements `unassignedColonyShips`; otherwise returns `state` unchanged.
  - `tryQueueBuild(state: GameState, planetId: string, order: { kind: 'colonyShip' } | { kind: 'building', building: string, tier: number }) → GameState` — if the planet is player-owned with an empty `buildQueue`, and (for `building` orders) `tier` is exactly `buildings[building] + 1` and a tech unlocking `{building, tier}` is in `research.completedTechIds`, sets `buildQueue = { ...order, progress: 0 }`; otherwise returns `state` unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/logic.turn.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/logic.turn.test.js`
Expected: FAIL — exports not found

- [ ] **Step 3: Write the implementation**

Add to `logic.js` (update the top import to include `STARTING_COLONY_POPULATION`):

```js
import { PLANET_TYPES, BUILDING_DEFS, COLONY_SHIP_COST, TECH_TREE, STARTING_COLONY_POPULATION, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';
```

```js
export function resolveTurn(state) {
  let totalResearch = 0;
  let completedColonyShips = 0;

  const planets = state.planets.map((planet) => {
    if (!planet.owner) {
      return planet;
    }

    const grownPlanet = { ...planet, population: growPlanet(planet) };
    const outputs = getPlanetOutputs(grownPlanet);
    totalResearch += outputs.research;

    const { planet: resolvedPlanet, completed } = resolveBuildQueue(grownPlanet, outputs.production);
    if (completed?.kind === 'colonyShip') {
      completedColonyShips += 1;
    }
    return resolvedPlanet;
  });

  const { research } = applyResearchProgress(state.research, totalResearch);

  return {
    ...state,
    turn: state.turn + 1,
    planets,
    research,
    unassignedColonyShips: state.unassignedColonyShips + completedColonyShips,
  };
}

export function colonizePlanet(state, planetId) {
  const target = state.planets.find((p) => p.id === planetId);
  if (state.unassignedColonyShips <= 0 || !target || target.owner) {
    return state;
  }

  return {
    ...state,
    unassignedColonyShips: state.unassignedColonyShips - 1,
    planets: state.planets.map((p) =>
      p.id === planetId ? { ...p, owner: 'player', population: STARTING_COLONY_POPULATION } : p
    ),
  };
}

export function tryQueueBuild(state, planetId, order) {
  const planet = state.planets.find((p) => p.id === planetId);
  if (!planet || planet.owner !== 'player' || planet.buildQueue) {
    return state;
  }

  if (order.kind === 'building') {
    const currentTier = planet.buildings[order.building];
    if (order.tier !== currentTier + 1) {
      return state;
    }
    const unlocked = state.research.completedTechIds.some((techId) => {
      const tech = TECH_TREE.find((t) => t.id === techId);
      return tech.unlocks.building === order.building && tech.unlocks.tier === order.tier;
    });
    if (!unlocked) {
      return state;
    }
  }

  return {
    ...state,
    planets: state.planets.map((p) =>
      p.id === planetId ? { ...p, buildQueue: { ...order, progress: 0 } } : p
    ),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/logic.turn.test.js`
Expected: PASS (14 tests)

- [ ] **Step 5: Run the full test suite**

Run: `node --test`
Expected: All tests across `data.test.js`, `state.test.js`, `logic.outputs.test.js`, `logic.buildqueue.test.js`, `logic.research.test.js`, `logic.turn.test.js` PASS.

- [ ] **Step 6: Commit**

```bash
git add logic.js tests/logic.turn.test.js
git commit -m "Add turn resolution, colonization, and build queueing"
```

---

### Task 7: HTML shell and styling

**Files:**
- Create: `index.html`
- Create: `style.css`

**Interfaces:**
- Produces: static DOM structure that Task 8/9's `render.js` will populate. Required element ids:
  - `#turn-number`, `#total-population`, `#total-production`, `#total-research`, `#current-research-label`, `#end-turn-btn`
  - `#system-map` (container for planet cards)
  - `#planet-detail` (container for the selected planet's detail panel)
  - `#tech-panel` (container for the tech track list)

- [ ] **Step 1: Create the HTML shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MOO2 Core Loop</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header id="top-bar">
    <div class="stat">Turn <span id="turn-number">1</span></div>
    <div class="stat">Population <span id="total-population">0</span></div>
    <div class="stat">Production/turn <span id="total-production">0</span></div>
    <div class="stat">Research/turn <span id="total-research">0</span></div>
    <div class="stat">Researching: <span id="current-research-label">None</span></div>
    <button id="end-turn-btn">End Turn</button>
  </header>

  <main>
    <section id="system-map" aria-label="System map"></section>
    <aside id="planet-detail" aria-label="Planet detail">
      <p class="placeholder">Select a planet to see details.</p>
    </aside>
    <aside id="tech-panel" aria-label="Tech tree"></aside>
  </main>

  <script type="module" src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the stylesheet**

Create `style.css`:

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0b0f1a;
  color: #e6e9f0;
}
#top-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: #141a2b;
  border-bottom: 1px solid #2a3350;
}
#top-bar .stat { font-size: 0.9rem; }
#end-turn-btn {
  margin-left: auto;
  padding: 0.5rem 1rem;
  background: #3a5fd9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
#end-turn-btn:hover { background: #4a6fe9; }
main {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
}
#system-map {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  align-content: start;
}
.planet-card {
  border: 1px solid #2a3350;
  border-radius: 6px;
  padding: 0.75rem;
  background: #141a2b;
  cursor: pointer;
}
.planet-card.owned { border-color: #3a9d5f; }
.planet-card.unowned { border-color: #6a6f80; }
.planet-card.selected { outline: 2px solid #4a6fe9; }
.planet-card h3 { margin: 0 0 0.25rem; font-size: 1rem; }
.planet-card p { margin: 0.15rem 0; font-size: 0.8rem; color: #aab0c5; }
#planet-detail, #tech-panel {
  border: 1px solid #2a3350;
  border-radius: 6px;
  padding: 0.75rem;
  background: #141a2b;
}
.placeholder { color: #6a6f80; font-style: italic; }
.build-option, .tech-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid #2a3350;
}
.build-option button, .tech-row button {
  padding: 0.25rem 0.6rem;
  background: #3a5fd9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.build-option button:disabled, .tech-row button:disabled {
  background: #3a3f55;
  cursor: not-allowed;
}
.progress-bar {
  height: 6px;
  background: #2a3350;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.3rem;
}
.progress-bar-fill {
  height: 100%;
  background: #3a9d5f;
}
```

- [ ] **Step 3: Manually verify the shell loads**

Run: `python3 -m http.server 8000` from `~/moo2-clone`, open `http://localhost:8000/index.html` in a browser.
Expected: Page loads with the top bar, three empty panels, and a browser console error about `game.js` not found (expected — created in Task 10).

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "Add HTML shell and styling"
```

---

### Task 8: Render module (`render.js`)

**Files:**
- Create: `render.js`

**Interfaces:**
- Consumes: `GameState`/`Planet` shapes from Task 2; `getPlanetOutputs`, `getNextAvailableTech` from `logic.js`; `PLANET_TYPES`, `BUILDING_TYPES`, `BUILDING_DEFS`, `TECH_TREE` from `data.js`; DOM element ids from Task 7.
- Produces:
  - `renderAll(state: GameState, selectedPlanetId: string | null, handlers: RenderHandlers) → void` — re-renders the top bar, system map, planet detail panel, and tech panel from scratch based on `state` and which planet (if any) is selected.
  ```
  RenderHandlers = {
    onSelectPlanet: (planetId: string) => void,
    onQueueColonyShip: (planetId: string) => void,
    onQueueBuilding: (planetId: string, building: string, tier: number) => void,
    onColonize: (planetId: string) => void,
    onSelectResearch: (techId: string) => void,
    onEndTurn: () => void,
  }
  ```
  `renderAll` attaches these handlers to the DOM elements it creates; it does not call them itself.

- [ ] **Step 1: Write `render.js`**

Create `render.js`:

```js
import { getPlanetOutputs, getNextAvailableTech } from './logic.js';
import { PLANET_TYPES, BUILDING_TYPES, BUILDING_DEFS, TECH_TREE, COLONY_SHIP_COST } from './data.js';

function renderTopBar(state, handlers) {
  const totals = state.planets.reduce(
    (acc, planet) => {
      const outputs = getPlanetOutputs(planet);
      return {
        population: acc.population + planet.population,
        production: acc.production + outputs.production,
        research: acc.research + outputs.research,
      };
    },
    { population: 0, production: 0, research: 0 }
  );

  document.getElementById('turn-number').textContent = state.turn;
  document.getElementById('total-population').textContent = totals.population.toFixed(1);
  document.getElementById('total-production').textContent = totals.production.toFixed(1);
  document.getElementById('total-research').textContent = totals.research.toFixed(1);

  const currentTech = state.research.currentTechId
    ? TECH_TREE.find((t) => t.id === state.research.currentTechId)
    : null;
  document.getElementById('current-research-label').textContent = currentTech
    ? `${currentTech.name} (${state.research.progress.toFixed(0)}/${currentTech.cost})`
    : 'None selected';

  document.getElementById('end-turn-btn').onclick = handlers.onEndTurn;
}

function renderSystemMap(state, selectedPlanetId, handlers) {
  const container = document.getElementById('system-map');
  container.innerHTML = '';

  for (const planet of state.planets) {
    const card = document.createElement('div');
    card.className = `planet-card ${planet.owner ? 'owned' : 'unowned'}${planet.id === selectedPlanetId ? ' selected' : ''}`;
    card.innerHTML = `
      <h3>${planet.name}</h3>
      <p>${PLANET_TYPES[planet.typeKey].label}</p>
      <p>${planet.owner ? `Pop ${planet.population.toFixed(1)}/${planet.maxPopulation}` : 'Unowned'}</p>
    `;
    card.onclick = () => handlers.onSelectPlanet(planet.id);
    container.appendChild(card);
  }
}

function renderBuildOption(planet, label, cost, progress, onClick, disabled) {
  const row = document.createElement('div');
  row.className = 'build-option';
  const pct = Math.min(100, (progress / cost) * 100);
  row.innerHTML = `
    <div>
      <div>${label} (${cost} cost)</div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;
  const button = document.createElement('button');
  button.textContent = 'Build';
  button.disabled = disabled;
  button.onclick = onClick;
  row.appendChild(button);
  return row;
}

function renderPlanetDetail(state, selectedPlanetId, handlers) {
  const container = document.getElementById('planet-detail');
  container.innerHTML = '';

  const planet = state.planets.find((p) => p.id === selectedPlanetId);
  if (!planet) {
    container.innerHTML = '<p class="placeholder">Select a planet to see details.</p>';
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = planet.name;
  container.appendChild(heading);

  if (!planet.owner) {
    const info = document.createElement('p');
    info.textContent = `${PLANET_TYPES[planet.typeKey].label} · Unowned · Max pop ${planet.maxPopulation}`;
    container.appendChild(info);

    const colonizeBtn = document.createElement('button');
    colonizeBtn.textContent = `Send Colony Ship (${state.unassignedColonyShips} available)`;
    colonizeBtn.disabled = state.unassignedColonyShips <= 0;
    colonizeBtn.onclick = () => handlers.onColonize(planet.id);
    container.appendChild(colonizeBtn);
    return;
  }

  const outputs = getPlanetOutputs(planet);
  const info = document.createElement('p');
  info.textContent = `${PLANET_TYPES[planet.typeKey].label} · Pop ${planet.population.toFixed(1)}/${planet.maxPopulation} · Prod ${outputs.production.toFixed(1)} · Res ${outputs.research.toFixed(1)}`;
  container.appendChild(info);

  const queueHeading = document.createElement('h3');
  queueHeading.textContent = 'Build Queue';
  container.appendChild(queueHeading);

  if (planet.buildQueue) {
    const cost = planet.buildQueue.kind === 'colonyShip'
      ? COLONY_SHIP_COST
      : BUILDING_DEFS[planet.buildQueue.building].tiers[planet.buildQueue.tier - 1].cost;
    const label = planet.buildQueue.kind === 'colonyShip'
      ? 'Colony Ship'
      : `${planet.buildQueue.building} tier ${planet.buildQueue.tier}`;
    container.appendChild(renderBuildOption(planet, `Building: ${label}`, cost, planet.buildQueue.progress, () => {}, true));
    return;
  }

  container.appendChild(
    renderBuildOption(planet, 'Colony Ship', COLONY_SHIP_COST, 0, () => handlers.onQueueColonyShip(planet.id), false)
  );

  for (const building of BUILDING_TYPES) {
    const nextTier = planet.buildings[building] + 1;
    if (nextTier > 3) continue;
    const tierDef = BUILDING_DEFS[building].tiers[nextTier - 1];
    const unlocked = state.research.completedTechIds.some((techId) => {
      const tech = TECH_TREE.find((t) => t.id === techId);
      return tech.unlocks.building === building && tech.unlocks.tier === nextTier;
    });
    container.appendChild(
      renderBuildOption(
        planet,
        `${building} tier ${nextTier}${unlocked ? '' : ' (locked)'}`,
        tierDef.cost,
        0,
        () => handlers.onQueueBuilding(planet.id, building, nextTier),
        !unlocked
      )
    );
  }
}

function renderTechPanel(state, handlers) {
  const container = document.getElementById('tech-panel');
  container.innerHTML = '<h2>Research</h2>';

  const nextTech = getNextAvailableTech(state.research);

  for (const tech of TECH_TREE) {
    const row = document.createElement('div');
    row.className = 'tech-row';
    const completed = state.research.completedTechIds.includes(tech.id);
    const isCurrent = state.research.currentTechId === tech.id;
    let status = 'Locked';
    if (completed) status = 'Completed';
    else if (isCurrent) status = `In progress (${state.research.progress.toFixed(0)}/${tech.cost})`;
    else if (nextTech && nextTech.id === tech.id) status = 'Available';

    row.innerHTML = `<div>${tech.name} — ${status}</div>`;

    if (!completed && !state.research.currentTechId && nextTech && nextTech.id === tech.id) {
      const button = document.createElement('button');
      button.textContent = 'Start';
      button.onclick = () => handlers.onSelectResearch(tech.id);
      row.appendChild(button);
    }

    container.appendChild(row);
  }
}

export function renderAll(state, selectedPlanetId, handlers) {
  renderTopBar(state, handlers);
  renderSystemMap(state, selectedPlanetId, handlers);
  renderPlanetDetail(state, selectedPlanetId, handlers);
  renderTechPanel(state, handlers);
}
```

- [ ] **Step 2: Commit**

No automated test for this DOM-only module (per the spec's testing approach, it is verified manually in Task 10). Commit as-is:

```bash
git add render.js
git commit -m "Add DOM render module"
```

---

### Task 9: Persistence (`persistence.js`)

**Files:**
- Create: `persistence.js`

**Interfaces:**
- Consumes: `GameState` shape from Task 2.
- Produces:
  - `SAVE_KEY`: `string` = `'moo2-clone-save'`
  - `saveState(state: GameState) → void` — `localStorage.setItem(SAVE_KEY, JSON.stringify(state))`
  - `loadState() → GameState | null` — parses `localStorage.getItem(SAVE_KEY)`, returns `null` if absent or invalid JSON.

- [ ] **Step 1: Write `persistence.js`**

Create `persistence.js`:

```js
export const SAVE_KEY = 'moo2-clone-save';

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

This is a thin browser-only wrapper with no logic to unit test headlessly (no `localStorage` in the Node test environment); it's verified manually in Task 10's save/reload check.

```bash
git add persistence.js
git commit -m "Add localStorage persistence wrapper"
```

---

### Task 10: Wire it together (`game.js`) and manual verification

**Files:**
- Create: `game.js`

**Interfaces:**
- Consumes: `createInitialState` from `state.js`; `resolveTurn`, `colonizePlanet`, `tryQueueBuild`, `selectResearch` from `logic.js`; `renderAll` from `render.js`; `saveState`, `loadState` from `persistence.js`.
- Produces: no exports — this is the entry point loaded by `index.html`.

- [ ] **Step 1: Write `game.js`**

Create `game.js`:

```js
import { createInitialState } from './state.js';
import { resolveTurn, colonizePlanet, tryQueueBuild, selectResearch } from './logic.js';
import { renderAll } from './render.js';
import { saveState, loadState } from './persistence.js';

let state = loadState() ?? createInitialState();
let selectedPlanetId = null;

function rerender() {
  renderAll(state, selectedPlanetId, handlers);
}

function update(newState) {
  state = newState;
  saveState(state);
  rerender();
}

const handlers = {
  onSelectPlanet(planetId) {
    selectedPlanetId = planetId;
    rerender();
  },
  onQueueColonyShip(planetId) {
    update(tryQueueBuild(state, planetId, { kind: 'colonyShip' }));
  },
  onQueueBuilding(planetId, building, tier) {
    update(tryQueueBuild(state, planetId, { kind: 'building', building, tier }));
  },
  onColonize(planetId) {
    update(colonizePlanet(state, planetId));
  },
  onSelectResearch(techId) {
    update({ ...state, research: selectResearch(state.research, techId) });
  },
  onEndTurn() {
    update(resolveTurn(state));
  },
};

rerender();
```

- [ ] **Step 2: Run the full automated test suite one more time**

Run: `node --test`
Expected: All tests still PASS (this task adds no new pure-logic tests; it only wires existing tested modules together).

- [ ] **Step 3: Manual browser verification**

Run: `python3 -m http.server 8000` from `~/moo2-clone`, open `http://localhost:8000/index.html`.

Walk through, confirming each works:
1. Page loads showing Sol Prime as owned (pop 5) and four unowned planets.
2. Click Sol Prime → detail panel shows its stats and a Colony Ship build option.
3. Click "Build" on Colony Ship → queue shows progress bar, other build options disappear.
4. In the tech panel, click "Start" on Farming → top bar shows "Researching: Farming".
5. Click "End Turn" several times → population, production, research, and colony ship progress all increase; Farming eventually completes and a Farm tier-1 option appears when queue is empty.
6. Once the colony ship completes (`unassignedColonyShips` becomes 1), click an unowned planet, then click "Send Colony Ship" → that planet becomes owned with population 2.
7. Reload the page → all state (turn number, owned planets, research progress) is preserved from `localStorage`.

If any step fails, fix the relevant module (`render.js`, `game.js`, or `logic.js`) and re-run the full manual walkthrough from step 1.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "Wire up game entry point and complete manual verification"
```

---

### Task 11: Project metadata

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: `npm test` runs the full Node test suite; no other consumers.

- [ ] **Step 1: Create `package.json`**

Create `package.json`:

```json
{
  "name": "moo2-clone",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Browser-based MOO2-inspired colonization core loop (v0)",
  "scripts": {
    "test": "node --test",
    "start": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

Create `.gitignore`:

```
.DS_Store
node_modules/
```

- [ ] **Step 3: Create `README.md`**

Create `README.md`:

```markdown
# MOO2 Core Loop (v0)

A browser-based, Master of Orion 2-inspired colonization/growth/research
loop. See `docs/superpowers/specs/2026-07-02-moo2-core-loop-design.md` for
the full design.

## Run

    npm start

Then open http://localhost:8000/index.html

## Test

    npm test
```

- [ ] **Step 4: Run the full test suite via npm**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore README.md
git commit -m "Add project metadata and README"
```
