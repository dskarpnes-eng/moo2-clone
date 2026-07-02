import { PLANET_TYPES, BUILDING_DEFS, COLONY_SHIP_COST, TECH_TREE, STARTING_COLONY_POPULATION, BASE_PRODUCTION_PER_POP, BASE_RESEARCH_PER_POP, BASE_GROWTH_FRACTION } from './data.js';

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

  // Excess progress beyond cost is intentionally discarded here, not carried over to the next build.
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

export function isBuildingTierUnlocked(research, building, tier) {
  return research.completedTechIds.some((techId) => {
    const tech = TECH_TREE.find((t) => t.id === techId);
    return tech.unlocks.building === building && tech.unlocks.tier === tier;
  });
}

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

  // Excess research beyond cost is intentionally discarded, not carried over to the next tech.
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

export function resolveTurn(state) {
  let totalResearch = 0;
  let completedColonyShips = 0;

  const planets = state.planets.map((planet) => {
    if (!planet.owner) {
      return planet;
    }

    const outputs = getPlanetOutputs(planet);
    totalResearch += outputs.research;

    const { planet: resolvedPlanet, completed } = resolveBuildQueue(planet, outputs.production);
    if (completed?.kind === 'colonyShip') {
      completedColonyShips += 1;
    }
    return { ...resolvedPlanet, population: growPlanet(resolvedPlanet) };
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
    const unlocked = isBuildingTierUnlocked(state.research, order.building, order.tier);
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
