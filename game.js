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
