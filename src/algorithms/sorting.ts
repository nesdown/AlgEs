import type { Trace } from '../core/trace.js';
import { ArrayRun, type ArrayInput, type ArrayState } from './array.js';

const swapOrKeep = [
  { id: 'swap', label: 'Swap' },
  { id: 'keep', label: 'Keep' },
];

export function bubbleSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const n = r.n;
  r.snap(0, 'Walk the list, swapping neighbours that are out of order. The biggest value bubbles to the end each pass.');
  let pass = 0;
  let swapped = true;
  while (swapped && pass < n - 1) {
    swapped = false;
    r.snap(1, `Pass ${pass + 1}. Nothing swapped yet.`);
    for (let i = 1; i < n - pass; i++) {
      const a = r.values[i - 1]!;
      const b = r.values[i]!;
      r.stats.comparisons++;
      r.snap(3, `Compare ${a} and ${b}.`, { [i - 1]: 'compare', [i]: 'compare' }, [{ label: 'i', index: i }]);
      r.ask({
        kind: 'choice',
        prompt: `${a} then ${b}. Swap them?`,
        options: swapOrKeep,
        answer: a > b ? 'swap' : 'keep',
        why: a > b ? `${a} is bigger, so it moves right.` : `${a} is not bigger than ${b}, so they stay.`,
      });
      if (a > b) {
        r.swap(i - 1, i);
        swapped = true;
        r.snap(4, `${a} is bigger, so swap.`, { [i - 1]: 'swap', [i]: 'swap' }, [{ label: 'i', index: i }]);
      }
    }
    r.done[n - 1 - pass] = true;
    pass++;
    r.snap(6, swapped ? `${r.values[n - pass]} has reached its place.` : 'A whole pass with no swaps: the list is sorted.');
  }
  return r.finish('Sorted.', 6);
}
bubbleSort.code = ['repeat', '  swapped ← false', '  for i ← 1 to n − 1 − pass', '    if a[i−1] > a[i]', '      swap a[i−1], a[i]', '      swapped ← true', 'until not swapped'];

export function selectionSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const n = r.n;
  r.snap(0, 'Find the smallest value left, put it next in line, repeat.');
  for (let i = 0; i < n - 1; i++) {
    r.range = [i, n - 1];
    const rest = r.values.slice(i);
    const least = Math.min(...rest);
    const accept = rest.flatMap((v, k) => (v === least ? [i + k] : []));
    r.snap(1, `Pass ${i + 1}: look for the smallest value from position ${i} on.`, { [i]: 'min' }, [{ label: 'i', index: i }]);
    r.ask({
      kind: 'pick',
      prompt: 'Tap the smallest bar in the highlighted part.',
      candidates: rest.map((_, k) => i + k),
      accept,
      answer: accept[0]!,
      why: `${least} is the smallest value left.`,
    });
    let min = i;
    for (let j = i + 1; j < n; j++) {
      r.stats.comparisons++;
      r.snap(3, `Is ${r.values[j]} smaller than ${r.values[min]}?`, { [j]: 'compare', [min]: 'min' }, [{ label: 'i', index: i }, { label: 'j', index: j }]);
      if (r.values[j]! < r.values[min]!) {
        min = j;
        r.snap(4, `Yes. ${r.values[min]} is the new smallest.`, { [min]: 'min' }, [{ label: 'i', index: i }, { label: 'j', index: j }]);
      }
    }
    if (min !== i) {
      r.swap(i, min);
      r.snap(5, `Swap ${r.values[i]} into position ${i}.`, { [i]: 'swap', [min]: 'swap' });
    }
    r.done[i] = true;
  }
  return r.finish('Sorted.', 5);
}
selectionSort.code = ['for i ← 0 to n − 2', '  min ← i', '  for j ← i + 1 to n − 1', '    if a[j] < a[min]', '      min ← j', '  swap a[i], a[min]'];

export function insertionSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const n = r.n;
  r.snap(0, 'Take each value and slide it left until it fits, like sorting cards in your hand.');
  for (let i = 1; i < n; i++) {
    r.range = [0, i];
    let j = i;
    r.snap(1, `Take ${r.values[i]} and slide it left into place.`, { [i]: 'key' }, [{ label: 'j', index: j }]);
    while (j > 0) {
      const left = r.values[j - 1]!;
      const key = r.values[j]!;
      r.stats.comparisons++;
      r.snap(2, `Is ${left} bigger than ${key}?`, { [j - 1]: 'compare', [j]: 'key' }, [{ label: 'j', index: j }]);
      r.ask({
        kind: 'choice',
        prompt: `Slide ${key} past ${left}?`,
        options: [{ id: 'swap', label: 'Slide left' }, { id: 'keep', label: 'Stop here' }],
        answer: left > key ? 'swap' : 'keep',
        why: left > key ? `${left} is bigger, so ${key} keeps sliding.` : `${left} is not bigger, so ${key} has found its place.`,
      });
      if (left <= key) break;
      r.swap(j - 1, j);
      j--;
      r.snap(3, `Slide ${key} left.`, { [j]: 'key', [j + 1]: 'swap' }, [{ label: 'j', index: j }]);
    }
  }
  return r.finish('Sorted.', 0);
}
insertionSort.code = ['for i ← 1 to n − 1', '  j ← i', '  while j > 0 and a[j−1] > a[j]', '    swap a[j−1], a[j]', '    j ← j − 1'];

export function mergeSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input, { ids: false });
  const n = r.n;
  r.aux = r.values.map(() => null);
  r.snap(0, 'Split the list in half until each piece has one value, then merge pieces back in order.');

  const sort = (lo: number, hi: number): void => {
    if (hi <= lo) return;
    const mid = Math.floor((lo + hi) / 2);
    r.range = [lo, hi];
    r.snap(2, `Split positions ${lo} to ${hi} at ${mid}.`, {}, [{ label: 'lo', index: lo }, { label: 'hi', index: hi }]);
    sort(lo, mid);
    sort(mid + 1, hi);
    r.range = [lo, hi];
    let i = lo;
    let j = mid + 1;
    let k = lo;
    while (i <= mid && j <= hi) {
      const a = r.values[i]!;
      const b = r.values[j]!;
      r.stats.comparisons++;
      r.snap(6, `Which is smaller, ${a} or ${b}?`, { [i]: 'compare', [j]: 'compare' }, [{ label: 'left', index: i }, { label: 'right', index: j }]);
      r.ask({
        kind: 'choice',
        prompt: `Which goes next: ${a} from the left half, or ${b} from the right?`,
        options: [{ id: 'left', label: String(a) }, { id: 'right', label: String(b) }],
        answer: a <= b ? 'left' : 'right',
        why: a === b ? 'They are equal. Ties go left, which keeps merge sort stable.' : `${Math.min(a, b)} is smaller.`,
      });
      r.aux![k] = a <= b ? a : b;
      if (a <= b) i++;
      else j++;
      r.stats.writes++;
      r.snap(6, `Write ${r.aux![k]} into the merged row.`, { [k]: 'write' });
      k++;
    }
    while (i <= mid) {
      r.aux![k++] = r.values[i++]!;
      r.stats.writes++;
    }
    while (j <= hi) {
      r.aux![k++] = r.values[j++]!;
      r.stats.writes++;
    }
    r.snap(7, 'One half is empty. Copy the rest straight across.');
    for (let p = lo; p <= hi; p++) {
      r.values[p] = r.aux![p]!;
      r.aux![p] = null;
      r.stats.writes++;
    }
    const marks = Object.fromEntries(Array.from({ length: hi - lo + 1 }, (_, q) => [lo + q, 'write' as const]));
    r.snap(8, `Positions ${lo} to ${hi} are now in order.`, marks);
  };

  sort(0, n - 1);
  r.aux = null;
  return r.finish('Sorted.', 8);
}
mergeSort.code = ['mergeSort(lo, hi)', '  if hi − lo < 1: return', '  mid ← (lo + hi) ÷ 2', '  mergeSort(lo, mid); mergeSort(mid + 1, hi)', '  i ← lo, j ← mid + 1', '  while both halves have values', '    take the smaller of a[i], a[j]', '  copy whatever is left', '  copy the merged row back'];

export function quickSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const n = r.n;
  r.snap(0, 'Pick a pivot, move smaller values to its left, then sort each side the same way.');

  const sort = (lo: number, hi: number): void => {
    if (lo > hi) return;
    if (lo === hi) {
      r.done[lo] = true;
      return;
    }
    r.range = [lo, hi];
    const pivot = r.values[hi]!;
    r.snap(2, `Pivot is ${pivot}, the last value in this part.`, { [hi]: 'pivot' });
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      const v = r.values[j]!;
      r.stats.comparisons++;
      const pointers = [{ label: 'i', index: Math.max(i, lo) }, { label: 'j', index: j }];
      r.snap(5, `Is ${v} smaller than the pivot ${pivot}?`, { [j]: 'compare', [hi]: 'pivot' }, pointers);
      r.ask({
        kind: 'choice',
        prompt: `Is ${v} smaller than the pivot ${pivot}?`,
        options: [{ id: 'yes', label: 'Yes, move left' }, { id: 'no', label: 'No, leave it' }],
        answer: v < pivot ? 'yes' : 'no',
        why: v < pivot ? `${v} < ${pivot}, so it joins the left side.` : `${v} is not smaller than ${pivot}, so it stays on the right.`,
      });
      if (v < pivot) {
        i++;
        if (i !== j) r.swap(i, j);
        r.snap(6, `Move ${v} to the left side.`, { [i]: 'swap', [j]: 'swap', [hi]: 'pivot' }, [{ label: 'i', index: i }, { label: 'j', index: j }]);
      }
    }
    if (i + 1 !== hi) r.swap(i + 1, hi);
    r.done[i + 1] = true;
    r.snap(7, `Put the pivot ${pivot} between the two sides. It is now in its final place.`, { [i + 1]: 'pivot' });
    sort(lo, i);
    sort(i + 2, hi);
  };

  sort(0, n - 1);
  return r.finish('Sorted.', 8);
}
quickSort.code = ['quickSort(lo, hi)', '  if lo ≥ hi: return', '  pivot ← a[hi]', '  i ← lo − 1', '  for j ← lo to hi − 1', '    if a[j] < pivot', '      i ← i + 1; swap a[i], a[j]', '  swap a[i + 1], a[hi]', '  quickSort(lo, i); quickSort(i + 2, hi)'];

export function heapSort(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const n = r.n;
  r.snap(0, 'Treat the list as a tree where each parent beats its children, then keep moving the top to the end.');

  const siftDown = (start: number, end: number, line: number) => {
    let root = start;
    for (;;) {
      const left = 2 * root + 1;
      if (left > end) return;
      let child = left;
      if (left + 1 <= end) {
        r.stats.comparisons++;
        if (r.values[left + 1]! > r.values[left]!) child = left + 1;
      }
      r.stats.comparisons++;
      const parent = r.values[root]!;
      const big = r.values[child]!;
      r.snap(line, `Parent ${parent}, bigger child ${big}.`, { [root]: 'compare', [child]: 'compare' });
      r.ask({
        kind: 'choice',
        prompt: `Parent ${parent}, bigger child ${big}. Swap them?`,
        options: swapOrKeep,
        answer: big > parent ? 'swap' : 'keep',
        why: big > parent ? `${big} is bigger, so it rises above ${parent}.` : `${parent} already beats its children.`,
      });
      if (big <= parent) {
        r.snap(line, `${parent} already beats its children, so it stays.`, { [root]: 'compare' });
        return;
      }
      r.swap(root, child);
      r.snap(line, `${big} rises, ${parent} sinks.`, { [root]: 'swap', [child]: 'swap' });
      root = child;
    }
  };

  r.snap(1, 'Build the heap: fix every parent from the bottom up.');
  for (let start = Math.floor((n - 2) / 2); start >= 0; start--) siftDown(start, n - 1, 2);
  for (let end = n - 1; end > 0; end--) {
    r.swap(0, end);
    r.done[end] = true;
    r.snap(4, `Move the biggest value, ${r.values[end]}, to the end.`, { [0]: 'swap', [end]: 'swap' });
    siftDown(0, end - 1, 5);
  }
  return r.finish('Sorted.', 3);
}
heapSort.code = ['heapSort(a)', '  for each parent, bottom up', '    sift it down', '  for end ← n − 1 down to 1', '    swap a[0], a[end]', '    sift a[0] down within 0..end − 1'];
