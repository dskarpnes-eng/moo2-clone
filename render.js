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
