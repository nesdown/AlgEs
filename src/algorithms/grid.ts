import { emptyStats, type Step, type Trace } from '../core/trace.js';
import { rng } from '../core/rng.js';

export const EMPTY = 0;
export const FRONTIER = 1;
export const VISITED = 2;
export const PATH = 3;

export const MUD_COST = 5;

export interface GridInput {
  cols: number;
  rows: number;
  /** 1 = wall. */
  walls: Uint8Array;
  /** 1 = mud, which costs more to cross for algorithms that care about cost. */
  mud: Uint8Array;
  start: number;
  goal: number;
}

export interface GridState {
  kind: 'grid';
  status: Uint8Array;
  current: number;
}

type Strategy = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy';

const LINES: Record<Strategy, string[]> = {
  bfs: ['put start in the queue', 'while the queue is not empty', '  cell ← the oldest cell in the queue', '  if cell is the goal: done', '  for each open neighbour not seen yet', '    mark it seen, add it to the queue', 'no path'],
  dfs: ['push start on the stack', 'while the stack is not empty', '  cell ← the newest cell on the stack', '  if cell is the goal: done', '  for each open neighbour not seen yet', '    mark it seen, push it', 'no path'],
  dijkstra: ['cost[start] ← 0', 'while some cells are waiting', '  cell ← the waiting cell with the lowest cost', '  if cell is the goal: done', '  for each open neighbour', '    if cost[cell] + step < cost[neighbour]: update it', 'no path'],
  astar: ['cost[start] ← 0', 'while some cells are waiting', '  cell ← lowest cost + distance left', '  if cell is the goal: done', '  for each open neighbour', '    if cost[cell] + step < cost[neighbour]: update it', 'no path'],
  greedy: ['add start', 'while some cells are waiting', '  cell ← the waiting cell closest to the goal', '  if cell is the goal: done', '  for each open neighbour not seen yet', '    mark it seen, add it', 'no path'],
};

const PICK_WHY: Record<Strategy, string> = {
  bfs: 'BFS always takes the cell that has waited longest, so it spreads out evenly.',
  dfs: 'DFS always takes the newest cell, so it dives as deep as it can.',
  dijkstra: 'Dijkstra takes the waiting cell with the lowest total cost.',
  astar: 'A* takes the cell with the lowest cost so far plus the straight distance left.',
  greedy: 'Greedy takes whichever waiting cell looks closest to the goal.',
};

export function neighbours(cell: number, cols: number, rows: number): number[] {
  const x = cell % cols;
  const y = Math.floor(cell / cols);
  const out: number[] = [];
  if (y > 0) out.push(cell - cols);
  if (x < cols - 1) out.push(cell + 1);
  if (y < rows - 1) out.push(cell + cols);
  if (x > 0) out.push(cell - 1);
  return out;
}

const manhattan = (a: number, b: number, cols: number) =>
  Math.abs((a % cols) - (b % cols)) + Math.abs(Math.floor(a / cols) - Math.floor(b / cols));

/** Min-heap with insertion order as the tie-break, so runs are deterministic. */
class Queue {
  private items: Array<{ key: number; order: number; cell: number }> = [];
  private counter = 0;
  constructor(private readonly lifo = false) {}
  get size() {
    return this.items.length;
  }
  push(cell: number, key: number) {
    this.items.push({ key, order: this.lifo ? -this.counter++ : this.counter++, cell });
    this.up(this.items.length - 1);
  }
  pop(): { key: number; cell: number } {
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length) {
      this.items[0] = last;
      this.down(0);
    }
    return top;
  }
  private less(a: number, b: number) {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x.key < y.key || (x.key === y.key && x.order < y.order);
  }
  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) return;
      [this.items[i], this.items[p]] = [this.items[p]!, this.items[i]!];
      i = p;
    }
  }
  private down(i: number) {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.items.length && this.less(l, m)) m = l;
      if (r < this.items.length && this.less(r, m)) m = r;
      if (m === i) return;
      [this.items[i], this.items[m]] = [this.items[m]!, this.items[i]!];
      i = m;
    }
  }
}

function search(input: GridInput, strategy: Strategy): Trace<GridState> {
  const { cols, rows, walls, mud, start, goal } = input;
  const size = cols * rows;
  const weighted = strategy === 'dijkstra' || strategy === 'astar';
  const status = new Uint8Array(size);
  const cost = new Float64Array(size).fill(Infinity);
  const prev = new Int32Array(size).fill(-1);
  const priority = new Float64Array(size).fill(Infinity);
  const stats = emptyStats();
  const steps: Array<Step<GridState>> = [];
  const snap = (line: number, note: string, current = -1) =>
    steps.push({ state: { kind: 'grid', status: status.slice(), current }, line, note, stats: { ...stats } });
  const stepCost = (cell: number) => (weighted && mud[cell] ? MUD_COST : 1);
  const keyOf = (cell: number) => {
    switch (strategy) {
      case 'bfs':
      case 'dfs':
        return 0;
      case 'dijkstra':
        return cost[cell]!;
      case 'astar':
        return cost[cell]! + manhattan(cell, goal, cols);
      case 'greedy':
        return manhattan(cell, goal, cols);
    }
  };

  const queue = new Queue(strategy === 'dfs');
  cost[start] = 0;
  priority[start] = keyOf(start);
  queue.push(start, priority[start]!);
  status[start] = FRONTIER;
  snap(0, 'Start here.', start);
  let found = false;

  while (queue.size) {
    const { key, cell } = queue.pop();
    if (status[cell] === VISITED || key > priority[cell]!) continue; // A stale entry, superseded by a cheaper one.
    const waiting = [...status.keys()].filter((c) => status[c] === FRONTIER);
    // Cells that would be just as correct a choice: same priority, and for DFS only the newest.
    const accept = strategy === 'dfs' ? [cell] : waiting.filter((c) => priority[c] === key);
    snap(2, `Pick the next cell to explore. ${waiting.length} ${waiting.length === 1 ? 'is' : 'are'} waiting.`, -1);
    steps[steps.length - 1]!.ask = {
      kind: 'pick',
      prompt: 'Tap the cell this algorithm explores next.',
      candidates: waiting,
      accept: strategy === 'bfs' ? waiting.filter((c) => cost[c] === cost[cell]) : accept,
      answer: cell,
      why: PICK_WHY[strategy],
    };
    status[cell] = VISITED;
    stats.visits++;
    if (cell === goal) {
      found = true;
      snap(3, 'Reached the goal.', cell);
      break;
    }
    for (const next of neighbours(cell, cols, rows)) {
      if (walls[next] || status[next] === VISITED) continue;
      if (!weighted && status[next] === FRONTIER) continue;
      stats.comparisons++;
      const nextCost = cost[cell]! + stepCost(next);
      if (nextCost >= cost[next]!) continue;
      cost[next] = nextCost;
      prev[next] = cell;
      priority[next] = keyOf(next);
      status[next] = FRONTIER;
      queue.push(next, priority[next]!);
    }
    snap(5, weighted ? 'Update the cost of each open neighbour.' : 'Add the open neighbours to the waiting list.', cell);
  }

  if (!found) {
    snap(6, 'Every reachable cell is explored, and the goal is not among them. There is no path.');
    return { steps, meta: { found: false, visits: stats.visits } };
  }
  const path: number[] = [];
  for (let c = goal; c !== -1; c = prev[c]!) path.unshift(c);
  let walked = 0;
  for (const c of path) {
    status[c] = PATH;
    walked += c === start ? 0 : mud[c] ? MUD_COST : 1;
    steps.push({ state: { kind: 'grid', status: status.slice(), current: c }, line: 3, note: `Trace the path back: ${path.length} cells.`, stats: { ...stats } });
  }
  return { steps, meta: { found: true, visits: stats.visits, length: path.length - 1, cost: walked } };
}

export const bfs = Object.assign((input: GridInput) => search(input, 'bfs'), { code: LINES.bfs });
export const dfs = Object.assign((input: GridInput) => search(input, 'dfs'), { code: LINES.dfs });
export const dijkstra = Object.assign((input: GridInput) => search(input, 'dijkstra'), { code: LINES.dijkstra });
export const astar = Object.assign((input: GridInput) => search(input, 'astar'), { code: LINES.astar });
export const greedy = Object.assign((input: GridInput) => search(input, 'greedy'), { code: LINES.greedy });

export type GridShape = 'open' | 'maze' | 'scatter' | 'mud';

export function makeGrid(cols: number, rows: number, shape: GridShape, seed: number): GridInput {
  const random = rng(seed);
  const size = cols * rows;
  const walls = new Uint8Array(size);
  const mud = new Uint8Array(size);
  const row = Math.floor(rows / 2);
  let start = row * cols + 1;
  let goal = row * cols + cols - 2;

  if (shape === 'scatter') {
    for (let c = 0; c < size; c++) walls[c] = random() < 0.28 ? 1 : 0;
  }
  if (shape === 'mud') {
    for (let c = 0; c < size; c++) mud[c] = random() < 0.35 ? 1 : 0;
    const x = Math.floor(cols / 2);
    for (let y = 1; y < rows - 1; y++) walls[y * cols + x] = y === 1 ? 0 : 1;
  }
  if (shape === 'maze') {
    walls.fill(1);
    const cellsX = Math.floor((cols - 1) / 2);
    const cellsY = Math.floor((rows - 1) / 2);
    const at = (cx: number, cy: number) => (2 * cy + 1) * cols + (2 * cx + 1);
    const seen = new Uint8Array(cellsX * cellsY);
    const stack = [[0, 0] as [number, number]];
    seen[0] = 1;
    walls[at(0, 0)] = 0;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1]!;
      const options = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const)
        .map(([dx, dy]) => [cx + dx, cy + dy] as [number, number])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < cellsX && y < cellsY && !seen[y * cellsX + x]);
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [nx, ny] = options[Math.floor(random() * options.length)]!;
      seen[ny * cellsX + nx] = 1;
      walls[at(nx, ny)] = 0;
      walls[(at(cx, cy) + at(nx, ny)) / 2] = 0;
      stack.push([nx, ny]);
    }
    // A few extra openings, so there is more than one way through.
    for (let k = 0; k < Math.floor(size / 40); k++) {
      const c = Math.floor(random() * size);
      const x = c % cols;
      const y = Math.floor(c / cols);
      if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) walls[c] = 0;
    }
    start = at(0, 0);
    goal = at(cellsX - 1, cellsY - 1);
  }
  walls[start] = 0;
  walls[goal] = 0;
  mud[start] = 0;
  mud[goal] = 0;
  return { cols, rows, walls, mud, start, goal };
}
