import type { Trace } from '../core/trace.js';
import type { ArrayInput, ArrayState } from './array.js';
import type { GridInput, GridState } from './grid.js';
import { bubbleSort, heapSort, insertionSort, mergeSort, quickSort, selectionSort } from './sorting.js';
import { binarySearch, linearSearch } from './searching.js';
import { astar, bfs, dfs, dijkstra, greedy } from './grid.js';

export type Family = 'sorting' | 'searching' | 'pathfinding';

interface Base {
  id: string;
  name: string;
  family: Family;
  /** One plain sentence. */
  idea: string;
  code: string[];
  time: { best: string; average: string; worst: string };
  space: string;
  /** A fact that is easy to miss and worth remembering. */
  remember: string;
}

export interface ArrayAlgorithm extends Base {
  domain: 'array';
  run(input: ArrayInput): Trace<ArrayState>;
}

export interface GridAlgorithm extends Base {
  domain: 'grid';
  run(input: GridInput): Trace<GridState>;
}

export type Algorithm = ArrayAlgorithm | GridAlgorithm;

export const ALGORITHMS: Algorithm[] = [
  {
    id: 'bubble', name: 'Bubble sort', family: 'sorting', domain: 'array', run: bubbleSort, code: bubbleSort.code,
    idea: 'Swap neighbours that are out of order until nothing moves.',
    time: { best: 'n', average: 'n²', worst: 'n²' }, space: '1',
    remember: 'A pass with no swaps means it can stop early, so sorted input takes one pass.',
  },
  {
    id: 'selection', name: 'Selection sort', family: 'sorting', domain: 'array', run: selectionSort, code: selectionSort.code,
    idea: 'Find the smallest value left and put it next.',
    time: { best: 'n²', average: 'n²', worst: 'n²' }, space: '1',
    remember: 'Makes at most n − 1 swaps, the fewest of any sort here.',
  },
  {
    id: 'insertion', name: 'Insertion sort', family: 'sorting', domain: 'array', run: insertionSort, code: insertionSort.code,
    idea: 'Slide each value left until it fits, like cards in your hand.',
    time: { best: 'n', average: 'n²', worst: 'n²' }, space: '1',
    remember: 'The best choice for small or nearly sorted lists. Try the nearly sorted input.',
  },
  {
    id: 'merge', name: 'Merge sort', family: 'sorting', domain: 'array', run: mergeSort, code: mergeSort.code,
    idea: 'Split in half, sort each half, merge them back in order.',
    time: { best: 'n log n', average: 'n log n', worst: 'n log n' }, space: 'n',
    remember: 'Always n log n, but needs a second row of memory to merge into.',
  },
  {
    id: 'quick', name: 'Quick sort', family: 'sorting', domain: 'array', run: quickSort, code: quickSort.code,
    idea: 'Pick a pivot, put smaller values left of it, repeat on each side.',
    time: { best: 'n log n', average: 'n log n', worst: 'n²' }, space: 'log n',
    remember: 'Picking the last value as pivot makes sorted input its worst case. Try reversed.',
  },
  {
    id: 'heap', name: 'Heap sort', family: 'sorting', domain: 'array', run: heapSort, code: heapSort.code,
    idea: 'Arrange values as a tree with the biggest on top, then keep taking the top.',
    time: { best: 'n log n', average: 'n log n', worst: 'n log n' }, space: '1',
    remember: 'Guaranteed n log n with no extra memory, but not stable.',
  },
  {
    id: 'linear', name: 'Linear search', family: 'searching', domain: 'array', run: linearSearch, code: linearSearch.code,
    idea: 'Check every value until you find it.',
    time: { best: '1', average: 'n', worst: 'n' }, space: '1',
    remember: 'Works on any list, sorted or not.',
  },
  {
    id: 'binary', name: 'Binary search', family: 'searching', domain: 'array', run: binarySearch, code: binarySearch.code,
    idea: 'Check the middle and throw away the half that cannot hold the answer.',
    time: { best: '1', average: 'log n', worst: 'log n' }, space: '1',
    remember: 'A million sorted values take at most 20 checks. The list must be sorted.',
  },
  {
    id: 'bfs', name: 'Breadth-first search', family: 'pathfinding', domain: 'grid', run: bfs, code: bfs.code,
    idea: 'Explore in rings: every cell one step away, then two, then three.',
    time: { best: 'V + E', average: 'V + E', worst: 'V + E' }, space: 'V',
    remember: 'Finds the fewest steps, but ignores mud.',
  },
  {
    id: 'dfs', name: 'Depth-first search', family: 'pathfinding', domain: 'grid', run: dfs, code: dfs.code,
    idea: 'Go as deep as possible, back up only at dead ends.',
    time: { best: 'V + E', average: 'V + E', worst: 'V + E' }, space: 'V',
    remember: 'Finds a path, usually not the shortest one.',
  },
  {
    id: 'dijkstra', name: "Dijkstra's algorithm", family: 'pathfinding', domain: 'grid', run: dijkstra, code: dijkstra.code,
    idea: 'Always continue from the cheapest place reached so far.',
    time: { best: 'E log V', average: 'E log V', worst: 'E log V' }, space: 'V',
    remember: 'Finds the cheapest path when crossing cells costs different amounts. Mud costs 5.',
  },
  {
    id: 'astar', name: 'A* search', family: 'pathfinding', domain: 'grid', run: astar, code: astar.code,
    idea: "Dijkstra plus a hint: prefer cells that are closer to the goal.",
    time: { best: 'E log V', average: 'E log V', worst: 'E log V' }, space: 'V',
    remember: 'As cheap a path as Dijkstra, usually after exploring far fewer cells.',
  },
  {
    id: 'greedy', name: 'Greedy best-first', family: 'pathfinding', domain: 'grid', run: greedy, code: greedy.code,
    idea: 'Always head for whichever cell looks closest to the goal.',
    time: { best: 'V', average: 'E log V', worst: 'E log V' }, space: 'V',
    remember: 'Fast when the way is clear, easily fooled by walls.',
  },
];

export const byId = (id: string) => ALGORITHMS.find((a) => a.id === id)!;
export const FAMILY_NAMES: Record<Family, string> = { sorting: 'Sorting', searching: 'Searching', pathfinding: 'Pathfinding' };
