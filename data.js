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
