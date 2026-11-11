import type { Trace } from '../core/trace.js';
import { ArrayRun, type ArrayInput, type ArrayState } from './array.js';

export function linearSearch(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun(input);
  const target = input.target!;
  r.snap(0, `Look for ${target} by checking every value in turn.`);
  for (let i = 0; i < r.n; i++) {
    const v = r.values[i]!;
    r.stats.comparisons++;
    r.snap(2, `Is ${v} the ${target} we want?`, { [i]: 'probe' }, [{ label: 'i', index: i }]);
    r.ask({
      kind: 'choice',
      prompt: `Is this ${target}?`,
      options: [{ id: 'yes', label: 'Found it' }, { id: 'no', label: 'Keep looking' }],
      answer: v === target ? 'yes' : 'no',
      why: v === target ? 'It matches.' : `${v} is not ${target}.`,
    });
    if (v === target) {
      r.snap(3, `Found ${target} at position ${i}, after ${i + 1} checks.`, { [i]: 'found' });
      return { steps: r.steps, meta: { found: i } };
    }
    r.dim[i] = true;
  }
  r.snap(4, `${target} is not in the list. Every value had to be checked.`);
  return { steps: r.steps, meta: { found: -1 } };
}
linearSearch.code = ['for i ← 0 to n − 1', '  look at a[i]', '  if a[i] = target', '    return i', 'return not found'];

export function binarySearch(input: ArrayInput): Trace<ArrayState> {
  const r = new ArrayRun({ ...input, values: [...input.values].sort((a, b) => a - b) });
  const target = input.target!;
  let lo = 0;
  let hi = r.n - 1;
  r.range = [lo, hi];
  r.snap(0, `The list is sorted, so look for ${target} by halving the search area every time.`, {}, [{ label: 'lo', index: lo }, { label: 'hi', index: hi }]);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const pointers = [{ label: 'lo', index: lo }, { label: 'hi', index: hi }];
    r.snap(1, `Search positions ${lo} to ${hi}.`, {}, pointers);
    r.ask({
      kind: 'pick',
      prompt: 'Tap the bar binary search checks next.',
      candidates: Array.from({ length: hi - lo + 1 }, (_, k) => lo + k),
      accept: [mid],
      answer: mid,
      why: `The middle of ${lo} to ${hi} is (${lo} + ${hi}) ÷ 2 = ${mid}.`,
    });
    const v = r.values[mid]!;
    r.stats.comparisons++;
    r.snap(2, `The middle is ${v}.`, { [mid]: 'probe' }, [...pointers, { label: 'mid', index: mid }]);
    r.ask({
      kind: 'choice',
      prompt: `The middle is ${v}. Where is ${target}?`,
      options: [{ id: 'left', label: 'Left half' }, { id: 'found', label: 'Right here' }, { id: 'right', label: 'Right half' }],
      answer: v === target ? 'found' : v < target ? 'right' : 'left',
      why: v === target ? 'It matches.' : v < target ? `${v} < ${target}, so it can only be to the right.` : `${v} > ${target}, so it can only be to the left.`,
    });
    if (v === target) {
      r.snap(3, `Found ${target} at position ${mid}.`, { [mid]: 'found' });
      return { steps: r.steps, meta: { found: mid } };
    }
    if (v < target) {
      for (let k = lo; k <= mid; k++) r.dim[k] = true;
      lo = mid + 1;
      r.range = lo <= hi ? [lo, hi] : null;
      r.snap(4, `${v} is too small. Drop the left half.`, {}, [{ label: 'lo', index: Math.min(lo, r.n - 1) }, { label: 'hi', index: hi }]);
    } else {
      for (let k = mid; k <= hi; k++) r.dim[k] = true;
      hi = mid - 1;
      r.range = lo <= hi ? [lo, hi] : null;
      r.snap(5, `${v} is too big. Drop the right half.`, {}, [{ label: 'lo', index: lo }, { label: 'hi', index: Math.max(hi, 0) }]);
    }
  }
  r.snap(6, `${target} is not in the list.`);
  return { steps: r.steps, meta: { found: -1 } };
}
binarySearch.code = ['lo ← 0, hi ← n − 1', 'while lo ≤ hi', '  mid ← (lo + hi) ÷ 2', '  if a[mid] = target: return mid', '  if a[mid] < target: lo ← mid + 1', '  else: hi ← mid − 1', 'return not found'];
