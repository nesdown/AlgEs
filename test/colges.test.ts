import { describe, expect, it } from 'vitest';
import { run, STEP_LIMIT } from '../src/colges/interpreter.js';
import { parse } from '../src/colges/parser.js';
import { flowchart, type Flowchart } from '../src/colges/flowchart.js';
import { EXAMPLES } from '../src/colges/examples.js';

const out = (src: string) => {
  const r = run(src);
  if (r.error) throw r.error;
  return r.output;
};
const err = (src: string) => run(src).error;

describe('programs from 2016 still run', () => {
  it('example1', () => expect(out("algS \n\tstr var 'Hello_world!'\n\twr var\nalgE ")).toEqual(['Hello_world!']));
  it('example2: op and a then/else block', () => {
    expect(out('algS\n\tint a 13\n\n\tif op a > 12 then \n\t\top a * 5 \n\telse \n\t\top a - 2 \n\n\twr a\nalgE')).toEqual(['65']);
  });
  it('a whole program saved on one line', () => {
    expect(out('algS int a 12 if op a > 12 then op a + 4 else op a - 4 wr a algE ')).toEqual(['8']);
  });
  it('bool from 1, as the tutorial wrote it', () => {
    expect(out('algS\n bool c 1\n wr c\nalgE')).toEqual(['true']);
  });
});

describe('the language', () => {
  it('runs every bundled example', () => {
    for (const e of EXAMPLES) expect(run(e.source).error, e.name).toBeNull();
  });
  it('FizzBuzz', () => {
    const fizz = EXAMPLES.find((e) => e.id === 'fizzbuzz')!;
    expect(out(fizz.source).slice(0, 6)).toEqual(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz']);
    expect(out(fizz.source)[14]).toBe('FizzBuzz');
  });
  it('Euclid and Collatz', () => {
    expect(out(EXAMPLES.find((e) => e.id === 'gcd')!.source)).toEqual(['GCD is 12']);
    expect(out(EXAMPLES.find((e) => e.id === 'collatz')!.source)).toEqual(['Reached 1 after 111 steps']);
  });
  it('the while loop that 2016 left commented out', () => {
    expect(out('int n 3\nwhile n > 0 do\n  wr n\n  set n n - 1')).toEqual(['3', '2', '1']);
  });
  it('precedence, brackets, integer division, and text', () => {
    expect(out('wr 2 + 3 * 4\nwr (2 + 3) * 4\nwr 7 / 2\nwr -7 / 2\nwr 7 % 3\nwr \'a\' + 1 + 2')).toEqual(['14', '20', '3', '-3', '1', 'a12']);
  });
  it('logic', () => {
    expect(out('int a 5\nwr a > 1 and a < 9\nwr not a = 5\nwr a = 4 or a == 5\nwr a != 5')).toEqual(['true', 'false', 'true', 'false']);
  });
  it('modern assignment and comments', () => {
    expect(out("int a 1 // start\na = a + 1\nset a a * 10\n# note\nwr a")).toEqual(['20']);
  });
  it('single-line branches and else-if chains', () => {
    expect(out('int x 7\nif x > 5 then wr \'big\' else wr \'small\'')).toEqual(['big']);
  });
  it('empty-body loops and branches still lay out', () => {
    const p = parse('int a 1\nif a > 0 then\n  wr a\nwhile a > 5 do\n  set a a - 1');
    expect(() => flowchart(p)).not.toThrow();
  });
});

describe('helpful errors', () => {
  it.each([
    ['wr x', /has not been created/, 1],
    ['int a 1\nint a 2', /already exists/, 2],
    ["int a 'hi'", /holds a number/, 1],
    ['int a 1\nset a true', /holds a number/, 2],
    ['wr 1 / 0', /divide by zero/, 1],
    ["wr 'a' < 1", /Cannot compare/, 1],
    ['if 1 then wr 1', /true or false/, 1],
    ['if 1 > 0\n  wr 1', /then/, 1],
    ["wr 'oops", /closing quote/, 1],
    ['wr (1 + 2', /never closed/, 1],
    ['print 5', /does not know "print"/, 1],
    ['else\n wr 1', /no matching if/, 1],
    ['wr 1\n   wr 2', /indented/, 2],
    ['wr 1 $ 2', /symbol/, 1],
  ])('%s', (src, message, line) => {
    const e = err(src);
    expect(e?.message).toMatch(message);
    expect(e?.line).toBe(line);
  });
  it('stops a loop that never ends, and keeps the steps so far', () => {
    const r = run('int a 1\nwhile true do\n  set a a + 1');
    expect(r.error?.message).toMatch(/never ends/);
    expect(r.steps.length).toBe(STEP_LIMIT);
  });
});

describe('the step trace', () => {
  it('starts at Begin, ends at End, and records branches and variables', () => {
    const r = run('int a 2\nif a > 1 then\n  set a a * 3\nwr a');
    expect(r.steps[0]!.node).toBe('begin');
    expect(r.steps.at(-1)!.node).toBe('end');
    const decision = r.steps.find((s) => s.branch)!;
    expect(decision.branch).toBe('yes');
    expect(r.steps.at(-1)!.vars).toEqual([{ name: 'a', type: 'int', value: 6 }]);
    expect(r.steps.at(-1)!.output).toEqual(['6']);
  });
});

const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function checkChart(chart: Flowchart) {
  for (let i = 0; i < chart.nodes.length; i++) {
    const n = chart.nodes[i]!;
    expect(n.x).toBeGreaterThanOrEqual(0);
    expect(n.y).toBeGreaterThanOrEqual(0);
    expect(n.x + n.w).toBeLessThanOrEqual(chart.width);
    expect(n.y + n.h).toBeLessThanOrEqual(chart.height);
    for (let j = i + 1; j < chart.nodes.length; j++) expect(overlap(n, chart.nodes[j]!), `${n.label} / ${chart.nodes[j]!.label}`).toBe(false);
  }
  for (const e of chart.edges) {
    for (const [x, y] of e.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(chart.width);
      expect(y).toBeLessThanOrEqual(chart.height);
    }
    // Lines are drawn straight across or straight down, never diagonally.
    for (let k = 1; k < e.points.length; k++) {
      const [a, b] = [e.points[k - 1]!, e.points[k]!];
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
    }
  }
}

describe('flowcharts', () => {
  it('lay out every example with no overlapping shapes', () => {
    for (const e of EXAMPLES) {
      const chart = flowchart(parse(e.source));
      checkChart(chart);
      expect(chart.nodes[0]!.label).toBe('Begin');
      expect(chart.nodes.at(-1)!.label).toBe('End');
    }
  });
  it('use the right shapes', () => {
    const chart = flowchart(parse("int a 1\nwr a\nif a > 0 then wr 'x'"));
    expect(chart.nodes.map((n) => n.shape)).toEqual(['terminal', 'process', 'io', 'decision', 'io', 'terminal']);
  });
  it('label both ways out of every decision', () => {
    const chart = flowchart(parse(EXAMPLES.find((e) => e.id === 'fizzbuzz')!.source));
    const decisions = chart.nodes.filter((n) => n.shape === 'decision');
    for (const d of decisions) {
      expect(chart.edges.filter((e) => e.from === d.id && e.branch).map((e) => e.branch).sort()).toEqual(['no', 'yes']);
    }
  });
  it('give every run step a node to light up', () => {
    for (const e of EXAMPLES) {
      const r = run(e.source);
      const ids = new Set(flowchart(r.program!).nodes.map((n) => n.id));
      for (const s of r.steps) expect(ids.has(s.node), s.note).toBe(true);
    }
  });
});
