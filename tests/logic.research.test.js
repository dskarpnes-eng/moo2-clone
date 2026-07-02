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
