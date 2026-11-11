import { emptyStats, type Ask, type Stats, type Step, type Trace } from '../core/trace.js';
import { rng } from '../core/rng.js';

export type Mark = 'compare' | 'swap' | 'pivot' | 'min' | 'probe' | 'found' | 'key' | 'write';

export interface ArrayState {
  kind: 'array';
  values: number[];
  /** Stable identities so a view can animate an element moving. Null when elements are copied, as in merge sort. */
  ids: number[] | null;
  marks: Record<number, Mark>;
  done: boolean[];
  /** Elements ruled out, as in a search. */
  dim: boolean[];
  range: [number, number] | null;
  pointers: Array<{ label: string; index: number }>;
  aux: Array<number | null> | null;
  target: number | null;
}

export interface ArrayInput {
  values: number[];
  target?: number;
}

/** Records an array algorithm one snapshot at a time. */
export class ArrayRun {
  values: number[];
  ids: number[] | null;
  done: boolean[];
  dim: boolean[];
  range: [number, number] | null = null;
  aux: Array<number | null> | null = null;
  target: number | null;
  stats: Stats = emptyStats();
  steps: Array<Step<ArrayState>> = [];

  constructor(input: ArrayInput, options: { ids?: boolean } = {}) {
    this.values = [...input.values];
    this.ids = options.ids === false ? null : this.values.map((_, i) => i);
    this.done = this.values.map(() => false);
    this.dim = this.values.map(() => false);
    this.target = input.target ?? null;
  }

  get n() {
    return this.values.length;
  }

  snap(line: number, note: string, marks: Record<number, Mark> = {}, pointers: ArrayState['pointers'] = []): void {
    this.steps.push({
      state: {
        kind: 'array',
        values: [...this.values],
        ids: this.ids ? [...this.ids] : null,
        marks,
        done: [...this.done],
        dim: [...this.dim],
        range: this.range ? [...this.range] : null,
        pointers,
        aux: this.aux ? [...this.aux] : null,
        target: this.target,
      },
      line,
      note,
      stats: { ...this.stats },
    });
  }

  ask(ask: Ask): void {
    this.steps[this.steps.length - 1]!.ask = ask;
  }

  swap(i: number, j: number): void {
    [this.values[i], this.values[j]] = [this.values[j]!, this.values[i]!];
    if (this.ids) [this.ids[i], this.ids[j]] = [this.ids[j]!, this.ids[i]!];
    this.stats.swaps++;
  }

  finish(note: string, line: number): Trace<ArrayState> {
    this.done = this.values.map(() => true);
    this.range = null;
    this.snap(line, note);
    return { steps: this.steps, meta: {} };
  }
}

export type ArrayShape = 'random' | 'nearly' | 'reversed' | 'few';

/** Values from 5 to 99, so every bar stays visible. */
export function makeArray(size: number, shape: ArrayShape, seed: number): number[] {
  const random = rng(seed);
  const pick = () => 5 + Math.floor(random() * 95);
  let values = Array.from({ length: size }, pick);
  if (shape === 'nearly' || shape === 'reversed') values.sort((a, b) => a - b);
  if (shape === 'reversed') values.reverse();
  if (shape === 'nearly') {
    for (let k = 0; k < Math.max(1, Math.floor(size / 8)); k++) {
      const i = Math.floor(random() * (size - 1));
      [values[i], values[i + 1]] = [values[i + 1]!, values[i]!];
    }
  }
  if (shape === 'few') {
    const levels = [20, 45, 70, 95];
    values = values.map(() => levels[Math.floor(random() * levels.length)]!);
  }
  return values;
}
