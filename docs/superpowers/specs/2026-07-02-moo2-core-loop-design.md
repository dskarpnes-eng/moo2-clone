# MOO2 Core Loop — v0 Design

## Purpose

A first playable slice of a Master of Orion 2-inspired 4X game, scoped down to
the essential colonization/growth/research loop. Runs entirely in the browser
with no backend. This is deliberately not a full MOO2 clone — it establishes
the core loop that later phases (multi-system travel, combat, diplomacy, AI
opponents, multiple races) will build on.

## Explicitly out of scope for v0

- Multiple star systems / interstellar travel
- Combat (ship-to-ship or ground)
- Diplomacy, AI opponents, other empires
- Multiple playable races
- Win/loss conditions
- Ship design/customization (only one fixed ship type: Colony Ship)
- Branching tech tree (v0 tech tree is a single linear track)

## Platform & stack

- Vanilla HTML/CSS/JS, no build step, no framework, no backend.
- Single page, opened directly in a browser (`index.html`).
- State persisted to `localStorage`, auto-saved after every turn and every
  player action that changes state; loaded on page load if present.

## Galaxy

- One star system containing 4-6 planets.
- Each planet has: name, size (max population), type (habitability modifier
  affecting growth rate and possibly base production/research), owner
  (player or unowned), current population, assigned building, build queue.
- Player starts owning one planet (home planet) with a small starting
  population.
- All other planets start unowned and must be colonized.

## Turn structure

- Turn-based, advanced only by an explicit "End Turn" button.
- On End Turn, in order:
  1. Each owned planet's population grows toward its max, at a rate driven
     by planet type/habitability and any growth-boosting building.
  2. Each owned planet produces Production and Research based on
     population and buildings.
  3. Production is applied to that planet's build queue (building or Colony
     Ship); when a queued item's cost is met, it completes.
  4. Research points accumulate toward the empire's currently selected tech;
     when met, the tech unlocks and the next tech (if any left) becomes
     selectable.
  5. Game state is saved to localStorage.
- Turn counter increments and is displayed.

## Colonization loop

- Colony Ship is the only buildable ship type in v0.
- Any owned planet can queue a Colony Ship in its build queue (cost in
  Production, takes multiple turns depending on planet output).
- When a Colony Ship completes, the player chooses an unowned planet in the
  system to send it to. Travel is instant (no multi-turn transit in v0).
- On arrival, the target planet becomes player-owned with a small starting
  population, and can then be assigned buildings / grow independently.

## Research / tech tree

- Single linear tech track, 9 techs.
- Player selects the next tech to research (from the next available tech in
  the line — no branching, no choice of order beyond "start it or not").
- Each tech costs a fixed amount of Research points, accumulated empire-wide
  (not per-planet).
- Completing a tech unlocks a new building type, or an upgrade tier of an
  existing building type, that becomes available in all planets' build
  queues going forward. Fixed progression (9 techs — each of the three
  building types gets exactly 3 tiers unlocked):
  1. Farming — unlocks Farm (+population growth rate)
  2. Industrialization — unlocks Factory (+production)
  3. Basic Physics — unlocks Lab (+research)
  4. Selective Breeding — unlocks Farm II (replaces Farm; stronger growth
     bonus)
  5. Automation — unlocks Factory II (replaces Factory; stronger production
     bonus)
  6. Applied Physics — unlocks Lab II (replaces Lab; stronger research
     bonus)
  7. Advanced Farming — unlocks Farm III (strongest growth bonus)
  8. Robotic Production — unlocks Factory III (strongest production bonus)
  9. Quantum Physics — unlocks Lab III (strongest research bonus)
- "Replaces" means the upgraded tier is what appears in build queues going
  forward; a planet that already completed the lower tier keeps its bonus
  and does not need to rebuild — the queue simply offers the better version
  next.
- No techs unlock new ship types or combat capability in v0.

## Buildings

- Each planet can have one building under construction at a time (queued
  alongside/instead of a Colony Ship — a planet's build queue can hold one
  item: either a building or a Colony Ship).
- Each planet can have multiple completed buildings over time (each
  producing its passive bonus), but only one construction project active at
  once.
- Buildings unlocked by tech: Farm, Factory, Lab (see tech tree above).

## UI layout

- **Top bar**: empire-wide summary — total population, Production/turn,
  Research/turn, current turn number, currently selected research tech +
  progress, "End Turn" button.
- **Left/main panel**: system map — planets shown as clickable icons/cards
  indicating owner, population, type; unowned planets are visually distinct
  and clickable as colonization targets when a Colony Ship is available to
  send.
- **Right panel**: selected planet detail — name, type, population/max,
  Production and Research output, build queue (current item + progress bar,
  option to change queued item from available buildings/Colony Ship).
- **Tech panel**: list of the linear tech track showing completed / current
  / locked techs and their unlock effects; lets the player confirm or leave
  the current research target (single track, so mostly informational plus a
  "start next tech" action once current completes).

## Persistence

- Entire game state (turn number, planets, buildings, tech progress,
  in-flight colony ships) serialized as JSON to a single `localStorage` key.
- Saved after every End Turn resolution and after any player action that
  changes state (queuing a build, launching/landing a colony ship,
  selecting research).
- On page load, state is restored from localStorage if present; otherwise a
  new game is initialized.

## Testing approach

- Core game logic (turn resolution, growth, production, research
  accumulation, colonization) implemented as pure functions separate from
  DOM rendering, so they can be unit-tested headlessly (e.g., with Node
  running a simple test script, no browser required).
- Manual browser testing for UI interactions (clicking planets, queuing
  builds, sending colony ships, end turn) as part of verification before
  calling the slice complete.
