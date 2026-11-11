import { FRONTIER, PATH, VISITED, neighbours, type GridInput, type GridState } from '../algorithms/grid.js';

export type Tool = 'wall' | 'mud' | 'erase';

export interface GridViewOptions {
  candidates?: Set<number> | null;
  flash?: { index: number; ok: boolean } | null;
  reveal?: number | null;
}

const read = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** The pathfinding board, drawn on a canvas. Paint walls and mud, drag the start and goal. */
export class GridView {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private input: GridInput | null = null;
  private state: GridState | null = null;
  private options: GridViewOptions = {};
  private cell = 10;
  private ox = 0;
  private oy = 0;
  tool: Tool = 'wall';
  editable = false;
  onChange: ((input: GridInput) => void) | null = null;
  onPick: ((cell: number) => void) | null = null;
  private drag: { kind: 'start' | 'goal' | 'paint'; value: number } | null = null;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'grid-view';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Pathfinding board');
    host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    new ResizeObserver(() => this.draw()).observe(this.canvas);
    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', () => this.up());
  }

  render(input: GridInput, state: GridState | null, options: GridViewOptions = {}) {
    this.input = input;
    this.state = state;
    this.options = options;
    this.canvas.classList.toggle('picking', !!options.candidates?.size);
    this.canvas.classList.toggle('editing', this.editable);
    this.draw();
  }

  private cellAt(e: PointerEvent): number {
    if (!this.input) return -1;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - this.ox) / this.cell);
    const y = Math.floor((e.clientY - rect.top - this.oy) / this.cell);
    if (x < 0 || y < 0 || x >= this.input.cols || y >= this.input.rows) return -1;
    return y * this.input.cols + x;
  }

  private down(e: PointerEvent) {
    const c = this.cellAt(e);
    if (c < 0 || !this.input) return;
    if (this.options.candidates?.size) {
      if (this.options.candidates.has(c)) this.onPick?.(c);
      return;
    }
    if (!this.editable) return;
    this.canvas.setPointerCapture(e.pointerId);
    if (c === this.input.start) this.drag = { kind: 'start', value: 0 };
    else if (c === this.input.goal) this.drag = { kind: 'goal', value: 0 };
    else {
      const layer = this.tool === 'mud' ? this.input.mud : this.input.walls;
      // Starting on a painted cell erases, so one tool both draws and clears.
      const value = this.tool === 'erase' ? 0 : layer[c] ? 0 : 1;
      this.drag = { kind: 'paint', value };
      this.paint(c);
    }
  }

  private move(e: PointerEvent) {
    if (!this.drag || !this.input) return;
    const c = this.cellAt(e);
    if (c < 0) return;
    if (this.drag.kind === 'paint') return this.paint(c);
    if (this.input.walls[c] || c === this.input.start || c === this.input.goal) return;
    this.input[this.drag.kind] = c;
    this.input.mud[c] = 0;
    this.onChange?.(this.input);
  }

  private up() {
    this.drag = null;
  }

  private paint(c: number) {
    const input = this.input!;
    if (c === input.start || c === input.goal) return;
    const v = this.drag!.value;
    if (this.tool === 'erase') {
      if (!input.walls[c] && !input.mud[c]) return;
      input.walls[c] = 0;
      input.mud[c] = 0;
    } else if (this.tool === 'wall') {
      if (input.walls[c] === v) return;
      input.walls[c] = v;
      if (v) input.mud[c] = 0;
    } else {
      if (input.mud[c] === v || input.walls[c]) return;
      input.mud[c] = v;
    }
    this.onChange?.(input);
  }

  private draw() {
    const input = this.input;
    if (!input) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const hgt = this.canvas.clientHeight;
    if (!w || !hgt) return;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(hgt * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(hgt * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const { cols, rows } = input;
    const cell = Math.max(4, Math.floor(Math.min(w / cols, hgt / rows)));
    this.cell = cell;
    this.ox = Math.floor((w - cell * cols) / 2);
    this.oy = Math.floor((hgt - cell * rows) / 2);
    const color = {
      chalk: read('--chalk'), dim: read('--chalk-faint'), line: read('--line'), yellow: read('--yellow'), pink: read('--pink'),
      blue: read('--blue'), green: read('--green'), mud: read('--mud'), cellBg: read('--board-lift'),
    };
    const status = this.state?.status;
    const pad = Math.max(1, Math.round(cell * 0.08));
    const at = (c: number) => [this.ox + (c % cols) * cell, this.oy + Math.floor(c / cols) * cell] as const;

    for (let c = 0; c < cols * rows; c++) {
      const [x, y] = at(c);
      const st = status?.[c] ?? 0;
      if (input.walls[c]) {
        ctx.fillStyle = color.chalk;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = color.cellBg;
      ctx.fillRect(x + pad / 2, y + pad / 2, cell - pad, cell - pad);
      if (input.mud[c]) {
        ctx.fillStyle = color.mud;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x + pad / 2, y + pad / 2, cell - pad, cell - pad);
        ctx.globalAlpha = 1;
      }
      if (st === VISITED) {
        ctx.fillStyle = color.blue;
        ctx.globalAlpha = 0.62;
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        ctx.globalAlpha = 1;
      } else if (st === FRONTIER) {
        ctx.strokeStyle = color.yellow;
        ctx.lineWidth = Math.max(1.5, cell * 0.1);
        ctx.strokeRect(x + pad * 2, y + pad * 2, cell - pad * 4, cell - pad * 4);
      } else if (st === PATH) {
        ctx.fillStyle = color.yellow;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        ctx.globalAlpha = 1;
      }
    }

    if (status) this.drawPath(status, input, cell, at, color.yellow);

    const ring = (c: number, stroke: string, width: number, dash: number[] = []) => {
      const [x, y] = at(c);
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      ctx.restore();
    };
    for (const c of this.options.candidates ?? []) ring(c, color.chalk, 1.5, [3, 3]);
    if (this.options.reveal !== null && this.options.reveal !== undefined) ring(this.options.reveal, color.green, 3);
    if (this.options.flash) ring(this.options.flash.index, this.options.flash.ok ? color.green : color.pink, 3);
    if (this.state && this.state.current >= 0) ring(this.state.current, color.pink, Math.max(2, cell * 0.12));

    const dot = (c: number, fill: string, letter: string) => {
      const [x, y] = at(c);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell * 0.36, 0, Math.PI * 2);
      ctx.fill();
      if (cell >= 16) {
        ctx.fillStyle = read('--board-deep');
        ctx.font = `700 ${Math.round(cell * 0.42)}px ${read('--display')}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, x + cell / 2, y + cell / 2 + 1);
      }
    };
    dot(input.start, color.green, 'S');
    dot(input.goal, color.pink, 'G');
  }

  private drawPath(status: Uint8Array, input: GridInput, cell: number, at: (c: number) => readonly [number, number], stroke: string) {
    const ordered: number[] = [];
    let c = input.start;
    const seen = new Set<number>();
    while (status[c] === PATH && !seen.has(c)) {
      ordered.push(c);
      seen.add(c);
      const next = neighbours(c, input.cols, input.rows).find((n) => status[n] === PATH && !seen.has(n));
      if (next === undefined) break;
      c = next;
    }
    if (ordered.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, cell * 0.22);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ordered.forEach((p, i) => {
      const [x, y] = at(p);
      if (i) ctx.lineTo(x + cell / 2, y + cell / 2);
      else ctx.moveTo(x + cell / 2, y + cell / 2);
    });
    ctx.stroke();
    ctx.restore();
  }
}
