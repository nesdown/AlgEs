import { ALGORITHMS, FAMILY_NAMES, byId, type Algorithm, type Family } from '../algorithms/catalog.js';
import { makeArray, type ArrayShape, type ArrayState } from '../algorithms/array.js';
import { makeGrid, type GridInput, type GridShape, type GridState } from '../algorithms/grid.js';
import { isCorrect, type Ask, type Step, type Trace } from '../core/trace.js';
import { randomSeed, rng } from '../core/rng.js';
import { run, type RunResult } from '../colges/interpreter.js';
import { flowchart, type Flowchart } from '../colges/flowchart.js';
import { EXAMPLES } from '../colges/examples.js';
import { $, h } from './dom.js';
import { ArrayView } from './arrayView.js';
import { GridView, type Tool } from './gridView.js';
import { FlowView } from './flowView.js';
import { Editor } from './editor.js';
import { loadProgress, saveProgress } from './progress.js';

type Mode = 'watch' | 'predict' | 'do' | 'race' | 'build';
type AnyState = ArrayState | GridState;

const MODES: Array<{ id: Mode; name: string; hint: string }> = [
  { id: 'watch', name: 'Watch', hint: 'step through it' },
  { id: 'predict', name: 'Predict', hint: 'guess what is next' },
  { id: 'do', name: 'Do', hint: 'you are the algorithm' },
  { id: 'race', name: 'Race', hint: 'two at once' },
  { id: 'build', name: 'Build', hint: 'write ColgEs' },
];

const SPEEDS = [1, 2, 3, 5, 8, 12, 20, 30, 45, 60];
const RIVALS: Record<Family, [string, string]> = { sorting: ['bubble', 'quick'], searching: ['linear', 'binary'], pathfinding: ['bfs', 'astar'] };
const QUESTIONS = 6;

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 4.5v15L6 12z"/><path d="M5 4.5h2v15H5z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4.5v15L18 12z"/><path d="M17 4.5h2v15h-2z"/></svg>',
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 9.3l1.9-.6A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg>',
};

interface Feedback {
  ok: boolean;
  why: string;
  given: string | number;
  /** The question being answered. It stays here after the step counts as answered. */
  ask: Ask;
}

const progress = loadProgress();

const S = {
  mode: 'watch' as Mode,
  algo: byId('bubble') as Algorithm,
  rival: 'quick',
  size: 16,
  shape: 'random' as ArrayShape,
  gridShape: 'maze' as GridShape,
  tool: 'wall' as Tool,
  seed: randomSeed(),
  target: 0,
  grid: null as GridInput | null,
  trace: null as Trace<AnyState> | null,
  traceB: null as Trace<AnyState> | null,
  index: 0,
  playing: false,
  speed: 3,
  questions: new Set<number>(),
  results: new Map<number, boolean>(),
  waiting: false,
  feedback: null as Feedback | null,
  mistakes: 0,
  started: false,
  finished: false,
  source: EXAMPLES[0]!.source,
  example: EXAMPLES[0]!.id,
  result: null as RunResult | null,
  chart: null as Flowchart | null,
};

// ------------------------------------------------------------------ inputs

const gridSize = () => (S.mode === 'do' ? [15, 9] : window.innerWidth < 700 ? [17, 13] : [31, 17]);

function arrayInput() {
  const values = makeArray(S.mode === 'do' ? Math.min(S.size, 8) : S.size, S.shape, S.seed);
  return S.algo.family === 'searching' ? { values, target: S.target } : { values };
}

function newTarget() {
  const random = rng(S.seed + 7);
  const values = makeArray(S.mode === 'do' ? Math.min(S.size, 8) : S.size, S.shape, S.seed);
  S.target = random() < 0.8 ? values[Math.floor(random() * values.length)]! : 1 + Math.floor(random() * 99);
}

function newGrid() {
  const [cols, rows] = gridSize();
  S.grid = makeGrid(cols!, rows!, S.gridShape, S.seed);
}

function runAlgorithm(algo: Algorithm): Trace<AnyState> {
  if (algo.domain === 'array') return algo.run(arrayInput());
  return algo.run(S.grid!);
}

function rebuild() {
  if (S.mode === 'build') return;
  if (S.algo.domain === 'grid' && !S.grid) newGrid();
  S.trace = runAlgorithm(S.algo);
  S.traceB = S.mode === 'race' ? runAlgorithm(byId(S.rival)) : null;
  S.index = 0;
  S.playing = false;
  S.waiting = false;
  S.feedback = null;
  S.results.clear();
  S.mistakes = 0;
  S.finished = false;
  S.started = S.mode !== 'do';
  S.questions = S.mode === 'predict' ? pickQuestions(S.trace.steps) : new Set();
  checkAsk();
}

/** Spreads the questions out over the run instead of bunching them at the start. */
function pickQuestions(steps: Array<Step<AnyState>>): Set<number> {
  const asks = steps.flatMap((s, i) => (s.ask ? [i] : []));
  const count = Math.min(QUESTIONS, asks.length);
  return new Set(Array.from({ length: count }, (_, k) => asks[Math.floor(((k + 0.5) * asks.length) / count)]!));
}

// ------------------------------------------------------------------ playback

const steps = () => S.trace?.steps ?? [];
const lastIndex = () => (S.mode === 'race' ? Math.max(steps().length, S.traceB?.steps.length ?? 0) - 1 : steps().length - 1);
const stepAt = (trace: Trace<AnyState> | null, i: number) => (trace ? trace.steps[Math.min(i, trace.steps.length - 1)]! : null);
const buildSteps = () => S.result?.steps ?? [];

function currentAsk(): Ask | null {
  if (S.mode !== 'predict' && S.mode !== 'do') return null;
  const step = steps()[S.index];
  if (!step?.ask || S.results.has(S.index)) return null;
  if (S.mode === 'predict' && !S.questions.has(S.index)) return null;
  return step.ask;
}

function checkAsk() {
  S.waiting = currentAsk() !== null;
}

function forward(): boolean {
  if (S.mode === 'build') {
    if (S.index >= buildSteps().length - 1) return false;
    S.index++;
    return true;
  }
  if (!S.trace || !S.started || S.waiting || S.feedback) return false;
  if (S.index >= lastIndex()) {
    finish();
    return false;
  }
  S.index++;
  checkAsk();
  if (S.index >= lastIndex() && !S.waiting) finish();
  return true;
}

function finish() {
  if (S.finished) return;
  S.finished = true;
  S.playing = false;
  const mine = (progress[S.algo.id] ??= {});
  if (S.mode === 'watch') mine.watched = true;
  if (S.mode === 'predict' && S.questions.size) {
    const right = [...S.results.values()].filter(Boolean).length;
    mine.predict = Math.max(mine.predict ?? 0, right / S.questions.size);
    if (right === S.questions.size) burst();
  }
  if (S.mode === 'do') {
    mine.did = Math.min(mine.did ?? Infinity, S.mistakes);
    if (S.mistakes === 0) burst();
  }
  saveProgress(progress);
}

let last = performance.now();
let carry = 0;
// A timer rather than animation frames, so a run keeps going in a background tab.
function loop() {
  const now = performance.now();
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (S.playing) {
    carry += dt * SPEEDS[S.speed]!;
    let moved = false;
    while (carry >= 1) {
      carry -= 1;
      if (!forward()) {
        if (S.mode === 'build' || S.finished) S.playing = false;
        carry = 0;
        break;
      }
      moved = true;
    }
    if (moved || !S.playing) render();
  } else carry = 0;
}

function setPlaying(on: boolean) {
  if (on && S.mode !== 'build' && S.finished) rebuildSame();
  if (on && S.mode === 'build' && S.index >= buildSteps().length - 1) S.index = 0;
  if (on && S.mode !== 'build') S.started = true;
  S.playing = on;
  render();
}

function rebuildSame() {
  rebuild();
  S.started = true;
}

function step(delta: number) {
  S.playing = false;
  if (delta > 0) forward();
  else if (S.mode === 'watch' || S.mode === 'race' || S.mode === 'build') {
    S.index = Math.max(0, S.index - 1);
    S.finished = false;
  }
  render();
}

// ------------------------------------------------------------------ answers

function answer(given: string | number) {
  const ask = currentAsk();
  if (!ask || S.feedback?.ok) return;
  const ok = isCorrect(ask, given);
  if (S.mode === 'predict') {
    S.results.set(S.index, ok);
    S.feedback = { ok, why: ask.why, given, ask };
  } else {
    if (ok) {
      S.results.set(S.index, true);
      S.feedback = { ok, why: ask.why, given, ask };
      setTimeout(() => {
        S.feedback = null;
        S.waiting = false;
        if (!forward()) finish();
        render();
      }, 650);
    } else {
      S.mistakes++;
      S.feedback = { ok, why: ask.why, given, ask };
    }
  }
  render();
}

function continueAfterFeedback() {
  if (!S.feedback) return;
  if (S.mode === 'do' && !S.feedback.ok) {
    S.feedback = null;
    render();
    return;
  }
  S.feedback = null;
  S.waiting = false;
  if (!forward()) finish();
  S.playing = true;
  render();
}

// ------------------------------------------------------------------ build mode

let lastShape = '';
function compile(animate = true) {
  S.result = run(S.source);
  if (S.result.program) {
    S.chart = flowchart(S.result.program);
    const shape = JSON.stringify(S.chart.nodes.map((n) => [n.shape, n.label, n.x, n.y]));
    flowView.set(S.chart, animate && shape !== lastShape);
    lastShape = shape;
  }
  S.index = 0;
  S.playing = false;
}

// ------------------------------------------------------------------ chalk dust

function burst() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $<HTMLCanvasElement>('#dust');
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;
  const colors = ['#eef1e6', '#f3d77a', '#f3a5b8', '#9fd6ee', '#a9e3a2'];
  const bits = Array.from({ length: 140 }, () => ({
    x: width / 2, y: height * 0.55, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 2, r: Math.random() * 3 + 1, c: colors[Math.floor(Math.random() * colors.length)]!, life: 1,
  }));
  const tick = () => {
    ctx.clearRect(0, 0, width, height);
    let alive = false;
    for (const b of bits) {
      b.vy += 0.25;
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 0.012;
      if (b.life <= 0) continue;
      alive = true;
      ctx.globalAlpha = b.life;
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.r, b.r);
    }
    if (alive) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, width, height);
  };
  tick();
}

// ------------------------------------------------------------------ the page

const app = $('#app');
const rail = $('#rail');
const modesNav = $('#modes');
const stage = $('#stage');
const panel = $('#panel');
const tray = $('#tray');
const quiz = $('#quiz');

const boardA = h('div', { className: 'board' });
const boardB = h('div', { className: 'board' });
const boards = h('div', { className: 'boards' }, boardA, boardB);
const buildArea = h('div', { className: 'build' });
stage.prepend(boards, buildArea);

const headA = h('div', { className: 'board-head' });
const headB = h('div', { className: 'board-head' });
const holdA = h('div', { className: 'board-body' });
const holdB = h('div', { className: 'board-body' });
boardA.append(headA, holdA);
boardB.append(headB, holdB);
const arrA = new ArrayView(holdA);
const arrB = new ArrayView(holdB);
const gridA = new GridView(holdA);
const gridB = new GridView(holdB);
arrA.onPick = (i) => answer(i);
gridA.onPick = (c) => answer(c);
for (const g of [gridA, gridB]) {
  g.onChange = () => {
    rebuild();
    render();
  };
}

const editorHost = h('div', { className: 'pane code-pane' }, h('div', { className: 'pane-title' }, 'ColgEs', h('small', { text: 'edit freely, it reruns as you type' })));
const flowHost = h('div', { className: 'pane flow-pane' });
const flowScroll = h('div', { className: 'flow-scroll' });
flowHost.append(h('div', { className: 'pane-title' }, 'Flowchart', h('small', { text: 'ISO 5807 shapes' })), flowScroll);
const sideHost = h('div', { className: 'pane run-pane' });
buildArea.append(editorHost, flowHost, sideHost);
const editor = new Editor(editorHost);
const flowView = new FlowView(flowScroll);
editor.value = S.source;
let typing = 0;
editor.onChange = (src) => {
  S.source = src;
  clearTimeout(typing);
  typing = window.setTimeout(() => {
    compile();
    render();
  }, 250);
};

function chooseAlgorithm(id: string) {
  const prevFamily = S.algo.family;
  S.algo = byId(id);
  if (S.algo.family !== prevFamily || S.rival === id) {
    const [a, b] = RIVALS[S.algo.family];
    S.rival = id === b ? a : b;
  }
  if (S.algo.family === 'searching') newTarget();
  rebuild();
  render(true);
}

function setMode(mode: Mode) {
  const wasDo = S.mode === 'do';
  S.mode = mode;
  if (mode === 'build') {
    compile();
  } else {
    if (S.algo.domain === 'grid' && (wasDo || mode === 'do')) newGrid();
    if (S.algo.family === 'searching') newTarget();
    rebuild();
  }
  render(true);
}

function shuffle() {
  S.seed = randomSeed();
  if (S.algo.family === 'searching') newTarget();
  if (S.algo.domain === 'grid') newGrid();
  rebuild();
  render();
}

// Static chrome: mode tabs and the algorithm list.
modesNav.replaceChildren(
  ...MODES.map((m) =>
    h('button', { className: 'mode', role: 'tab', 'data-mode': m.id, onClick: () => setMode(m.id) }, h('b', { text: m.name }), h('small', { text: m.hint })),
  ),
);

function renderRail() {
  rail.replaceChildren(
    ...(['sorting', 'searching', 'pathfinding'] as Family[]).map((family) =>
      h('section', {},
        h('h3', { text: FAMILY_NAMES[family] }),
        ...ALGORITHMS.filter((a) => a.family === family).map((a) => {
          const p = progress[a.id] ?? {};
          return h('button', { className: `algo${a.id === S.algo.id ? ' active' : ''}`, 'data-id': a.id, onClick: () => chooseAlgorithm(a.id), 'aria-pressed': String(a.id === S.algo.id) },
            h('span', { text: a.name }),
            h('i', { className: 'dots', title: 'Watched, predicted, done' },
              h('em', { className: p.watched ? 'on' : '' }),
              h('em', { className: (p.predict ?? 0) >= 0.8 ? 'on' : (p.predict ?? 0) > 0 ? 'half' : '' }),
              h('em', { className: p.did !== undefined ? 'on' : '' }),
            ),
          );
        }),
      ),
    ),
  );
}

const big = (s: string) => `O(${s})`;

function renderPanel() {
  const a = S.algo;
  if (S.mode === 'race') {
    const b = byId(S.rival);
    const rivals = ALGORITHMS.filter((x) => x.family === a.family && x.id !== a.id);
    const select = h('select', { id: 'rival', 'aria-label': 'Second algorithm', onChange: (e: Event) => { S.rival = (e.target as HTMLSelectElement).value; rebuild(); render(true); } },
      ...rivals.map((x) => h('option', { value: x.id, selected: x.id === S.rival, text: x.name })),
    );
    const row = (label: string, x: string, y: string) => h('tr', {}, h('th', { text: label }), h('td', { text: x }), h('td', { text: y }));
    panel.replaceChildren(
      h('h2', { text: 'Race' }),
      h('p', { className: 'idea', text: 'Same input, one step each per tick. Fewer steps means less work.' }),
      h('label', { className: 'field', for: 'rival' }, 'Against', select),
      h('table', { className: 'facts' },
        h('thead', {}, h('tr', {}, h('th'), h('th', { text: a.name }), h('th', { text: b.name }))),
        h('tbody', {},
          row('Average', big(a.time.average), big(b.time.average)),
          row('Worst', big(a.time.worst), big(b.time.worst)),
          row('Memory', big(a.space), big(b.space)),
        ),
      ),
      h('div', { className: 'race-score', id: 'race-score' }),
    );
    return;
  }
  const chip = (label: string, value: string) => h('span', { className: 'chip' }, h('small', { text: label }), big(value));
  panel.replaceChildren(
    h('h2', { text: a.name }),
    h('p', { className: 'idea', text: a.idea }),
    h('div', { className: 'chips' }, chip('best', a.time.best), chip('average', a.time.average), chip('worst', a.time.worst), chip('memory', a.space)),
    h('ol', { className: 'pseudo', id: 'pseudo' }, ...a.code.map((line) => h('li', {}, h('code', { text: line })))),
    h('p', { className: 'note', id: 'note', 'aria-live': 'polite' }),
    h('dl', { className: 'stats', id: 'stats' }),
    h('p', { className: 'remember' }, h('b', { text: 'Remember ' }), a.remember),
  );
}

function statsFor(step: Step<AnyState>, domain: 'array' | 'grid') {
  const st = step.stats;
  const items: Array<[string, number]> = domain === 'grid' ? [['explored', st.visits], ['checks', st.comparisons]] : [['comparisons', st.comparisons], [st.writes ? 'writes' : 'swaps', st.writes || st.swaps]];
  return items;
}

function renderStats(el: HTMLElement, step: Step<AnyState>, domain: 'array' | 'grid') {
  el.replaceChildren(...statsFor(step, domain).flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
}

function renderBoards() {
  const race = S.mode === 'race';
  boardB.hidden = !race;
  const a = stepAt(S.trace, S.index);
  const b = race ? stepAt(S.traceB, S.index) : null;
  if (!a) return;
  const ask = S.feedback?.ask ?? (S.waiting ? currentAsk() : null);
  const pickable = ask?.kind === 'pick' && !(S.feedback?.ok) ? new Set(ask.candidates) : null;
  const flash = S.feedback && typeof S.feedback.given === 'number' ? { index: S.feedback.given, ok: S.feedback.ok } : null;
  const reveal = S.mode === 'predict' && S.feedback && !S.feedback.ok && ask?.kind === 'pick' ? ask.answer : null;
  const grid = S.algo.domain === 'grid';
  const editable = grid && S.index === 0 && !S.playing && !S.waiting;

  for (const [view, other] of [[arrA, gridA], [arrB, gridB]] as const) {
    view.root.hidden = grid;
    other.canvas.hidden = !grid;
  }
  gridA.editable = gridB.editable = editable;
  gridA.tool = gridB.tool = S.tool;
  if (grid) {
    gridA.render(S.grid!, a.state as GridState, { candidates: pickable, flash, reveal });
    if (b) gridB.render(S.grid!, b.state as GridState);
  } else {
    arrA.render(a.state as ArrayState, { candidates: pickable, flash, reveal });
    if (b) arrB.render(b.state as ArrayState);
  }

  const finishedAt = (t: Trace<AnyState> | null) => (t ? t.steps.length - 1 : 0);
  const head = (el: HTMLElement, algo: Algorithm, trace: Trace<AnyState> | null, step: Step<AnyState>) => {
    const done = S.index >= finishedAt(trace);
    el.replaceChildren(
      h('b', { text: algo.name }),
      h('span', { className: 'counter' }, ...statsFor(step, algo.domain).map(([k, v]) => h('span', {}, h('em', { text: v }), ` ${k}`))),
      ...(done && race ? [h('span', { className: 'badge', text: `done in ${finishedAt(trace)} steps` })] : []),
    );
  };
  head(headA, S.algo, S.trace, a);
  if (b) head(headB, byId(S.rival), S.traceB, b);
  headA.hidden = !race;
}

function renderDynamic() {
  if (S.mode === 'build') return renderBuild();
  const step = stepAt(S.trace, S.index);
  if (!step) return;
  if (S.mode === 'race') {
    const score = $('#race-score');
    const la = (S.trace?.steps.length ?? 1) - 1;
    const lb = (S.traceB?.steps.length ?? 1) - 1;
    if (score) {
      score.replaceChildren(
        S.index >= Math.max(la, lb)
          ? h('p', { className: 'verdict' }, la === lb ? 'A dead heat.' : `${la < lb ? S.algo.name : byId(S.rival).name} won by ${Math.abs(la - lb)} steps.`)
          : h('p', { className: 'verdict quiet', text: S.index ? 'Racing…' : 'Press play to start the race.' }),
      );
    }
  } else {
    const pseudo = $('#pseudo');
    if (pseudo) [...pseudo.children].forEach((li, i) => li.classList.toggle('on', i === step.line));
    const note = $('#note');
    if (note) note.textContent = step.note;
    const stats = $('#stats');
    if (stats) renderStats(stats, step, S.algo.domain);
  }
  renderBoards();
  renderQuiz();
  renderTray();
}

function renderQuiz() {
  fillQuiz();
  app.classList.toggle('quiz-open', !quiz.hidden);
}

function fillQuiz() {
  const ask = S.feedback?.ask ?? (S.waiting ? currentAsk() : null);
  quiz.hidden = false;
  quiz.className = 'quiz';
  if (S.mode === 'do' && !S.started) {
    quiz.replaceChildren(
      h('p', { className: 'q-title', text: 'You are the algorithm.' }),
      h('p', { text: `Make every decision ${S.algo.name.toLowerCase()} would make. Wrong moves count as mistakes.` }),
      h('button', { className: 'primary', onClick: () => setPlaying(true), text: 'Start' }),
    );
    return;
  }
  if (S.finished && (S.mode === 'predict' || S.mode === 'do')) {
    const right = [...S.results.values()].filter(Boolean).length;
    const perfect = S.mode === 'predict' ? right === S.questions.size : S.mistakes === 0;
    quiz.classList.add('done');
    quiz.replaceChildren(
      h('p', { className: 'q-title', text: S.mode === 'predict' ? `${right} of ${S.questions.size} right` : S.mistakes ? `Done, with ${S.mistakes} ${S.mistakes === 1 ? 'mistake' : 'mistakes'}` : 'Flawless.' }),
      h('p', { text: perfect ? 'You think like the algorithm now.' : 'Try a new input and see if it sticks.' }),
      h('div', { className: 'row' },
        h('button', { className: 'primary', onClick: () => { shuffle(); if (S.mode === 'do') setPlaying(true); else setPlaying(true); }, text: 'New input' }),
        h('button', { onClick: () => { rebuild(); setPlaying(true); }, text: 'Same again' }),
      ),
    );
    return;
  }
  if (S.feedback && ask) {
    quiz.classList.add(S.feedback.ok ? 'ok' : 'bad');
    const correct = ask.kind === 'choice' ? ask.options.find((o) => o.id === ask.answer)?.label : null;
    quiz.replaceChildren(
      h('p', { className: 'q-title', text: S.feedback.ok ? 'Right.' : S.mode === 'do' ? 'Not quite. Try again.' : correct ? `Not quite: ${correct}.` : 'Not quite.' }),
      h('p', { text: S.mode === 'do' && !S.feedback.ok ? hintFor(ask) : S.feedback.why }),
      ...(S.mode === 'predict' || !S.feedback.ok ? [h('button', { className: 'primary', onClick: continueAfterFeedback, text: S.mode === 'do' ? 'Try again' : 'Continue' })] : []),
    );
    return;
  }
  if (ask) {
    const total = S.mode === 'predict' ? `${[...S.results.keys()].length + 1} of ${S.questions.size}` : `${S.mistakes} ${S.mistakes === 1 ? 'mistake' : 'mistakes'}`;
    quiz.replaceChildren(
      h('p', { className: 'q-meta', text: S.mode === 'predict' ? `Question ${total}` : total }),
      h('p', { className: 'q-title', text: ask.prompt }),
      ask.kind === 'choice'
        ? h('div', { className: 'row' }, ...ask.options.map((o, i) => h('button', { className: 'choice', onClick: () => answer(o.id) }, h('kbd', { text: i + 1 }), o.label)))
        : h('p', { className: 'q-hint', text: S.algo.domain === 'grid' ? 'Dotted cells are the candidates.' : 'Highlighted bars are the candidates.' }),
    );
    return;
  }
  quiz.hidden = true;
}

function hintFor(ask: Ask): string {
  if (S.algo.domain === 'grid') return S.algo.id === 'dfs' ? 'Hint: the newest cell added to the waiting list.' : S.algo.id === 'bfs' ? 'Hint: the cell that has waited longest, closest to the start.' : 'Hint: think about cost and distance to the goal.';
  if (ask.kind === 'pick') return 'Hint: look at the values in the highlighted part.';
  return 'Hint: compare the two values again.';
}

function seg<T extends string>(label: string, options: Array<[T, string]>, value: T, onPick: (v: T) => void) {
  return h('div', { className: 'seg', role: 'group', 'aria-label': label },
    ...options.map(([v, text]) => h('button', { 'aria-pressed': String(v === value), onClick: () => onPick(v), text })),
  );
}

function renderTray() {
  const left: HTMLElement[] = [];
  if (S.mode === 'build') {
    left.push(seg('Examples', EXAMPLES.map((e) => [e.id, e.name] as [string, string]), S.example, (id) => {
      S.example = id;
      S.source = EXAMPLES.find((e) => e.id === id)!.source;
      editor.value = S.source;
      compile();
      setPlaying(true);
    }));
  } else if (S.algo.domain === 'array') {
    const size = h('input', { type: 'range', id: 'size', min: 6, max: 40, value: S.size, 'aria-label': 'How many values', onInput: (e: Event) => { S.size = Number((e.target as HTMLInputElement).value); if (S.algo.family === 'searching') newTarget(); rebuild(); render(); } });
    if (S.mode !== 'do') left.push(h('label', { className: 'field compact', for: 'size' }, h('span', { text: `${S.size} values` }), size));
    left.push(seg('Input', [['random', 'Random'], ['nearly', 'Nearly sorted'], ['reversed', 'Reversed'], ['few', 'Few unique']], S.shape, (v) => { S.shape = v; if (S.algo.family === 'searching') newTarget(); rebuild(); render(); }));
    left.push(h('button', { onClick: shuffle, text: S.algo.family === 'searching' ? 'New list' : 'Shuffle' }));
  } else {
    left.push(seg('Board', [['open', 'Open'], ['maze', 'Maze'], ['scatter', 'Scatter'], ['mud', 'Mud']], S.gridShape, (v) => { S.gridShape = v; S.seed = randomSeed(); newGrid(); rebuild(); render(); }));
    left.push(seg('Draw', [['wall', 'Wall'], ['mud', 'Mud'], ['erase', 'Erase']], S.tool, (v) => { S.tool = v; render(); }));
  }

  const playing = S.playing;
  const canScrub = S.mode === 'watch' || S.mode === 'race' || S.mode === 'build';
  const total = S.mode === 'build' ? buildSteps().length - 1 : lastIndex();
  const scrub = h('input', { type: 'range', id: 'scrub', min: 0, max: Math.max(0, total), value: S.index, 'aria-label': 'Step', onInput: (e: Event) => { S.playing = false; S.index = Number((e.target as HTMLInputElement).value); S.finished = false; if (S.mode !== 'build') checkAsk(); render(); } });
  const speed = h('input', { type: 'range', id: 'speed', min: 0, max: SPEEDS.length - 1, value: S.speed, 'aria-label': 'Speed', onInput: (e: Event) => { S.speed = Number((e.target as HTMLInputElement).value); render(); } });
  const icon = (svg: string, label: string, onClick: () => void, cls = '') => {
    const b = h('button', { className: `icon ${cls}`, 'aria-label': label, title: label, onClick });
    b.innerHTML = svg;
    return b;
  };
  const right = h('div', { className: 'player' },
    icon(ICON.restart, 'Restart', () => { if (S.mode === 'build') { S.index = 0; S.playing = false; render(); } else { rebuild(); render(); } }),
    canScrub ? icon(ICON.back, 'Step back', () => step(-1)) : null,
    icon(playing ? ICON.pause : ICON.play, playing ? 'Pause' : 'Play', () => setPlaying(!playing), 'play'),
    canScrub ? icon(ICON.next, 'Step forward', () => step(1)) : null,
    canScrub ? h('label', { className: 'scrub', for: 'scrub' }, scrub, h('span', { className: 'count', text: `${S.index} / ${Math.max(0, total)}` })) : h('span', { className: 'count', text: S.mode === 'predict' ? `${[...S.results.values()].filter(Boolean).length} right so far` : `${S.mistakes} ${S.mistakes === 1 ? 'mistake' : 'mistakes'}` }),
    h('label', { className: 'speed', for: 'speed' }, h('span', { text: `${SPEEDS[S.speed]}/s` }), speed),
  );
  const focused = document.activeElement?.id;
  tray.replaceChildren(h('div', { className: 'inputs' }, ...left), right);
  if (focused) document.getElementById(focused)?.focus();
}

function renderBuild() {
  const result = S.result;
  const list = buildSteps();
  const step = list[Math.min(S.index, list.length - 1)];
  const atEnd = S.index >= list.length - 1;
  const error = result?.error ?? null;
  const parseError = !!error && !result?.program;
  const runtimeError = !!error && !parseError && atEnd;

  flowHost.classList.toggle('stale', parseError);
  if (step) {
    const visited = new Set(list.slice(0, S.index + 1).map((s) => s.node));
    flowView.highlight(step.node, visited, step.branch ? { from: step.node, branch: step.branch } : null, runtimeError);
  }
  editor.mark(parseError || runtimeError ? error!.line : step?.line ?? null, parseError || runtimeError ? 'error' : 'run');

  const vars = step?.vars ?? [];
  sideHost.replaceChildren(
    h('div', { className: 'pane-title' }, 'Run'),
    h('p', { className: 'note', 'aria-live': 'polite', text: parseError ? 'Fix the highlighted line to run the program.' : step?.note ?? '' }),
    h('h4', { text: 'Variables' }),
    vars.length
      ? h('table', { className: 'vars' }, h('tbody', {}, ...vars.map((v) => h('tr', { className: v.name === step?.changed ? 'changed' : '' }, h('td', { className: `t-${v.type === 'int' ? 'num' : v.type}`, text: v.type }), h('th', { text: v.name }), h('td', { text: typeof v.value === 'string' ? `'${v.value}'` : String(v.value) })))))
      : h('p', { className: 'empty', text: 'None yet. Create one with int, str or bool.' }),
    h('h4', { text: 'Output' }),
    h('pre', { className: 'console' }, ...(step?.output ?? []).map((line) => h('span', { text: line })), error && (parseError || runtimeError) ? h('span', { className: 'err', text: `Line ${error.line}: ${error.message}` }) : null),
  );
  renderTray();
}

let lastKey = '';
function render(full = false) {
  const key = `${S.mode}|${S.algo.id}|${S.rival}`;
  if (full || key !== lastKey) {
    lastKey = key;
    app.dataset.mode = S.mode;
    app.dataset.domain = S.algo.domain;
    for (const b of modesNav.querySelectorAll<HTMLElement>('.mode')) {
      const on = b.dataset.mode === S.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    }
    renderRail();
    if (S.mode !== 'build') renderPanel();
  } else if (S.finished) renderRail();
  renderDynamic();
}

// ------------------------------------------------------------------ keys and start

document.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range')) return;
  if (e.key === ' ') {
    e.preventDefault();
    if (S.mode === 'do' && !S.started) setPlaying(true);
    else setPlaying(!S.playing);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    step(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    step(-1);
  } else if (e.key === 'Enter' && S.feedback) {
    continueAfterFeedback();
  } else if (/^[1-9]$/.test(e.key)) {
    const ask = currentAsk();
    if (ask?.kind === 'choice' && !S.feedback) {
      const option = ask.options[Number(e.key) - 1];
      if (option) answer(option.id);
    }
  }
});

export function start() {
  // Lets automated checks drive the app: open with ?debug.
  if (location.search.includes('debug')) Object.assign(window, { alges: { S, answer, currentAsk, setMode, chooseAlgorithm, setPlaying, continueAfterFeedback, render } });
  const hash = location.hash.slice(1);
  if (ALGORITHMS.some((a) => a.id === hash)) S.algo = byId(hash);
  if (S.algo.family === 'searching') newTarget();
  if (MODES.some((m) => m.id === hash)) setMode(hash as Mode);
  else {
    rebuild();
    render(true);
  }
  setInterval(loop, 16);
}
