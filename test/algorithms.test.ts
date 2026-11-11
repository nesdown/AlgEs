import { describe, expect, it } from 'vitest';
import { ALGORITHMS, byId, type ArrayAlgorithm, type GridAlgorithm } from '../src/algorithms/catalog.js';
import { makeArray, type ArrayShape } from '../src/algorithms/array.js';
import { makeGrid, neighbours, FRONTIER, PATH, VISITED, MUD_COST, type GridInput } from '../src/algorithms/grid.js';
import { isCorrect } from '../src/core/trace.js';
import { rng } from '../src/core/rng.js';

const sorts = ALGORITHMS.filter((a): a is ArrayAlgorithm => a.family === 'sorting');
const arr = (id: string) => byId(id) as ArrayAlgorithm;
const grids = ALGORITHMS.filter((a): a is GridAlgorithm => a.domain === 'grid');
const shapes: ArrayShape[] = ['random', 'nearly', 'reversed', 'few'];

describe('every algorithm', () => {
  it('has a unique id and pseudocode lines that exist', () => {
    expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(ALGORITHMS.length);
    for (const a of ALGORITHMS) {
      const trace = a.domain === 'array' ? a.run({ values: makeArray(12, 'random', 3), target: 50 }) : a.run(makeGrid(15, 9, 'scatter', 3));
      for (const step of trace.steps) {
        expect(step.line, `${a.id}: ${step.note}`).toBeGreaterThanOrEqual(0);
        expect(step.line, `${a.id}: ${step.note}`).toBeLessThan(a.code.length);
        expect(step.note.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('sorting', () => {
  for (const algo of sorts) {
    for (const shape of shapes) {
      it(`${algo.name} sorts ${shape} input`, () => {
        for (let seed = 1; seed <= 8; seed++) {
          const values = makeArray(4 + seed * 3, shape, seed);
          const trace = algo.run({ values });
          const last = trace.steps.at(-1)!.state;
          expect(last.values).toEqual([...values].sort((a, b) => a - b));
          expect(last.done.every(Boolean)).toBe(true);
        }
      });
    }
    it(`${algo.name}: every question's answer is what actually happens next`, () => {
      const values = makeArray(14, 'few', 9);
      const { steps } = algo.run({ values });
      const asked = steps.filter((s) => s.ask);
      expect(asked.length).toBeGreaterThan(3);
      steps.forEach((step, i) => {
        if (!step.ask) return;
        const before = step.state.values;
        const after = steps[i + 1]!.state.values;
        if (step.ask.kind === 'choice' && (step.ask.answer === 'swap' || step.ask.answer === 'yes') && algo.id !== 'quick') {
          expect(after, step.note).not.toEqual(before);
        }
        if (step.ask.kind === 'choice' && step.ask.answer === 'keep') {
          expect(after, step.note).toEqual(before);
        }
        if (step.ask.kind === 'pick') {
          expect(step.ask.candidates).toContain(step.ask.answer);
          expect(step.ask.accept).toContain(step.ask.answer);
          expect(isCorrect(step.ask, step.ask.answer)).toBe(true);
        }
      });
    });
    it(`${algo.name}: animation ids follow the values`, () => {
      const values = makeArray(10, 'random', 4);
      const { steps } = algo.run({ values });
      for (const { state } of steps) {
        if (!state.ids) continue;
        expect(new Set(state.ids).size).toBe(values.length);
        state.ids.forEach((id, pos) => expect(state.values[pos]).toBe(values[id]));
      }
    });
  }
  it('counts work honestly: bubble sort on sorted input is one pass', () => {
    const values = makeArray(20, 'random', 1).sort((a, b) => a - b);
    const last = arr('bubble').run({ values }).steps.at(-1)!;
    expect(last.stats.comparisons).toBe(19);
    expect(last.stats.swaps).toBe(0);
  });
  it('insertion sort beats selection sort on nearly sorted input', () => {
    const values = makeArray(30, 'nearly', 2);
    const cmp = (id: string) => (byId(id) as ArrayAlgorithm).run({ values }).steps.at(-1)!.stats.comparisons;
    expect(cmp('insertion')).toBeLessThan(cmp('selection') / 3);
  });
  it('merge sort is stable: ties go left', () => {
    const { steps } = arr('merge').run({ values: [5, 5, 1] });
    const tie = steps.find((s) => s.ask?.kind === 'choice' && s.ask.why.includes('Ties'));
    expect(tie?.ask && tie.ask.kind === 'choice' && tie.ask.answer).toBe('left');
  });
});

describe('searching', () => {
  const values = makeArray(25, 'random', 5);
  const sorted = [...values].sort((a, b) => a - b);
  for (const id of ['linear', 'binary']) {
    const algo = byId(id) as ArrayAlgorithm;
    it(`${algo.name} finds every value present`, () => {
      for (const target of values) {
        const found = algo.run({ values, target }).meta.found as number;
        const list = id === 'binary' ? sorted : values;
        expect(list[found]).toBe(target);
      }
    });
    it(`${algo.name} reports a missing value`, () => {
      expect(algo.run({ values, target: 1000 }).meta.found).toBe(-1);
      expect(algo.run({ values, target: 0 }).meta.found).toBe(-1);
    });
  }
  it('binary search needs at most log2(n) + 1 checks', () => {
    const big = makeArray(1000, 'random', 6);
    for (const target of big.slice(0, 50)) {
      const last = arr('binary').run({ values: big, target }).steps.at(-1)!;
      expect(last.stats.comparisons).toBeLessThanOrEqual(Math.floor(Math.log2(1000)) + 1);
    }
  });
  it('binary search asks for the true middle', () => {
    const { steps } = arr('binary').run({ values: sorted, target: sorted[3] });
    const pick = steps.find((s) => s.ask?.kind === 'pick')!.ask!;
    expect(pick.kind === 'pick' && pick.answer).toBe(12);
  });
});

/** Shortest path by brute force, to check the algorithms against. */
function cheapest(input: GridInput, weighted: boolean): number {
  const dist = new Float64Array(input.cols * input.rows).fill(Infinity);
  dist[input.start] = 0;
  const todo = [input.start];
  while (todo.length) {
    todo.sort((a, b) => dist[a]! - dist[b]!);
    const c = todo.shift()!;
    for (const n of neighbours(c, input.cols, input.rows)) {
      if (input.walls[n]) continue;
      const d = dist[c]! + (weighted && input.mud[n] ? MUD_COST : 1);
      if (d < dist[n]!) {
        dist[n] = d;
        todo.push(n);
      }
    }
  }
  return dist[input.goal]!;
}

describe('pathfinding', () => {
  const boards = Array.from({ length: 12 }, (_, i) => makeGrid(21, 13, (['open', 'maze', 'scatter', 'mud'] as const)[i % 4], i + 1));

  it('BFS finds the fewest steps', () => {
    for (const g of boards) {
      const meta = byId('bfs').run(g as never).meta;
      const best = cheapest(g, false);
      if (best === Infinity) expect(meta.found).toBe(false);
      else expect(meta.length).toBe(best);
    }
  });
  it('Dijkstra and A* find the cheapest path through mud', () => {
    for (const g of boards) {
      const best = cheapest(g, true);
      for (const id of ['dijkstra', 'astar']) {
        const meta = byId(id).run(g as never).meta;
        if (best === Infinity) expect(meta.found).toBe(false);
        else expect(meta.cost, `${id}`).toBe(best);
      }
    }
  });
  it('A* explores no more than Dijkstra on open ground', () => {
    const open = makeGrid(31, 19, 'open', 1);
    expect(byId('astar').run(open as never).meta.visits).toBeLessThan(byId('dijkstra').run(open as never).meta.visits as number);
  });
  it('every algorithm finds some path when one exists, and never walks through walls', () => {
    for (const algo of grids) {
      for (const g of boards) {
        const { steps, meta } = algo.run(g);
        const reachable = cheapest(g, false) !== Infinity;
        expect(meta.found, algo.id).toBe(reachable);
        const last = steps.at(-1)!.state.status;
        last.forEach((s, c) => {
          if (g.walls[c]) expect(s).toBe(0);
        });
        if (reachable) {
          const path = [...last.keys()].filter((c) => last[c] === PATH);
          expect(path).toContain(g.start);
          expect(path).toContain(g.goal);
        }
      }
    }
  });
  it('the cell it asks you to pick is always waiting, and it is the one explored next', () => {
    for (const algo of grids) {
      const { steps } = algo.run(boards[2]!);
      steps.forEach((step, i) => {
        if (!step.ask || step.ask.kind !== 'pick') return;
        expect(step.ask.candidates.every((c) => step.state.status[c] === FRONTIER)).toBe(true);
        expect(steps[i + 1]!.state.status[step.ask.answer]).toBeGreaterThanOrEqual(VISITED);
      });
    }
  });
  it('mazes are fully connected and deterministic', () => {
    for (let seed = 1; seed < 10; seed++) {
      const g = makeGrid(25, 15, 'maze', seed);
      expect(cheapest(g, false)).toBeLessThan(Infinity);
      expect(makeGrid(25, 15, 'maze', seed).walls).toEqual(g.walls);
    }
  });
});

describe('random numbers', () => {
  it('repeat for the same seed', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
