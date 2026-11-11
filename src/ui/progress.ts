export interface Progress {
  watched?: boolean;
  /** Best share of predictions right, 0 to 1. */
  predict?: number;
  /** Fewest mistakes in a completed Do run. */
  did?: number;
}

const KEY = 'alges:progress:v2';

export function loadProgress(): Record<string, Progress> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Progress>;
  } catch {
    return {};
  }
}

export function saveProgress(all: Record<string, Progress>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private windows can refuse storage. Progress then lasts for this visit only.
  }
}
