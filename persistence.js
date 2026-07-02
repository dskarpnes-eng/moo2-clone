export const SAVE_KEY = 'moo2-clone-save';

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isValidGameState(parsed)) {
    return null;
  }

  return parsed;
}

function isValidGameState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Array.isArray(value.planets) &&
    typeof value.research === 'object' &&
    value.research !== null
  );
}
