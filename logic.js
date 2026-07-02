import { PLANET_TYPES, BUILDING_DEFS, COLONY_SHIP_COST, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';

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
