import type { ArrayState } from '../algorithms/array.js';
import { h } from './dom.js';

export interface ArrayViewOptions {
  /** Bars the learner may tap. */
  candidates?: Set<number> | null;
  /** Briefly marks a tapped bar right or wrong. */
  flash?: { index: number; ok: boolean } | null;
  /** Shows the right answer after a miss. */
  reveal?: number | null;
}

/** Bars drawn in chalk. Bars keep their identity between steps, so a swap slides instead of jumping. */
export class ArrayView {
  readonly root: HTMLElement;
  private readonly main: HTMLElement;
  private readonly aux: HTMLElement;
  private readonly labels: HTMLElement;
  private readonly targetLine: HTMLElement;
  private readonly bars = new Map<string, HTMLElement>();
  onPick: ((index: number) => void) | null = null;

  constructor(host: HTMLElement) {
    this.main = h('div', { className: 'bars' });
    this.aux = h('div', { className: 'bars aux', 'aria-hidden': 'true' });
    this.labels = h('div', { className: 'pointers', 'aria-hidden': 'true' });
    this.targetLine = h('div', { className: 'target-line' }, h('span'));
    this.root = h('div', { className: 'array-view' }, this.targetLine, this.main, this.labels, this.aux);
    this.root.addEventListener('click', (e) => {
      const bar = (e.target as HTMLElement).closest<HTMLElement>('.bar.pickable');
      if (bar && this.onPick) this.onPick(Number(bar.dataset.index));
    });
    host.append(this.root);
    new ResizeObserver(() => this.fit()).observe(this.root);
  }

  private count = 0;

  private fit() {
    const width = this.root.clientWidth;
    this.root.classList.toggle('narrow', this.count > 0 && width / this.count < 26);
  }

  render(state: ArrayState, options: ArrayViewOptions = {}): void {
    const n = state.values.length;
    this.count = n;
    this.fit();
    const slot = 100 / n;
    const seen = new Set<string>();
    const [lo, hi] = state.range ?? [0, n - 1];
    this.root.classList.toggle('has-aux', !!state.aux);

    state.values.forEach((value, i) => {
      const key = state.ids ? `id${state.ids[i]}` : `at${i}`;
      seen.add(key);
      let bar = this.bars.get(key);
      if (!bar) {
        bar = h('div', { className: 'bar' }, h('span'));
        this.bars.set(key, bar);
        this.main.append(bar);
      }
      bar.style.left = `${i * slot}%`;
      bar.style.width = `${slot}%`;
      bar.style.setProperty('--h', `${value}%`);
      bar.dataset.index = String(i);
      bar.firstElementChild!.textContent = String(value);
      const classes = ['bar'];
      const mark = state.marks[i];
      if (mark) classes.push(`m-${mark}`);
      if (state.done[i]) classes.push('done');
      if (state.dim[i]) classes.push('dim');
      if (state.range && (i < lo || i > hi)) classes.push('outside');
      if (options.candidates?.has(i)) classes.push('pickable');
      if (options.flash?.index === i) classes.push(options.flash.ok ? 'flash-ok' : 'flash-bad');
      if (options.reveal === i) classes.push('reveal');
      bar.className = classes.join(' ');
      bar.setAttribute('aria-label', `${value}`);
    });
    for (const [key, bar] of this.bars) {
      if (!seen.has(key)) {
        bar.remove();
        this.bars.delete(key);
      }
    }

    this.aux.replaceChildren(
      ...(state.aux ?? []).map((value, i) =>
        value === null ? h('div', { className: 'bar ghost', style: `left:${i * slot}%;width:${slot}%` }) : h('div', { className: 'bar m-write', style: `left:${i * slot}%;width:${slot}%;--h:${value}%` }, h('span', { text: value })),
      ),
    );

    this.labels.replaceChildren(
      ...state.pointers.map((p) => h('span', { style: `left:${(p.index + 0.5) * slot}%`, text: p.label })),
    );

    this.targetLine.hidden = state.target === null;
    if (state.target !== null) {
      this.targetLine.style.setProperty('--h', `${Math.min(state.target, 100)}%`);
      this.targetLine.firstElementChild!.textContent = `looking for ${state.target}`;
    }
  }
}
