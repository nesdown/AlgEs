export interface Stats {
  comparisons: number;
  swaps: number;
  writes: number;
  visits: number;
}

export const emptyStats = (): Stats => ({ comparisons: 0, swaps: 0, writes: 0, visits: 0 });

/**
 * A decision point. Shown with the step it belongs to; the next step reveals the answer.
 * Predict mode asks some of these. Do mode makes the learner answer every one.
 */
export type Ask =
  | { kind: 'choice'; prompt: string; options: Array<{ id: string; label: string }>; answer: string; why: string }
  | { kind: 'pick'; prompt: string; candidates: number[]; accept: number[]; answer: number; why: string };

export interface Step<S> {
  state: S;
  /** Pseudocode line to highlight. */
  line: number;
  /** What is happening, in plain words. */
  note: string;
  stats: Stats;
  ask?: Ask;
}

export interface Trace<S> {
  steps: Array<Step<S>>;
  meta: Record<string, number | string | boolean>;
}

export function isCorrect(ask: Ask, given: string | number): boolean {
  return ask.kind === 'choice' ? ask.answer === given : ask.accept.includes(given as number);
}
