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
