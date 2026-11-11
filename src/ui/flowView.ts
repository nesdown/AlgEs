import type { Flowchart, FlowNode } from '../colges/flowchart.js';
import { s } from './dom.js';

function shape(n: FlowNode): SVGElement {
  const { x, y, w, h } = n;
  switch (n.shape) {
    case 'terminal':
      return s('rect', { x, y, width: w, height: h, rx: h / 2 });
    case 'process':
      return s('rect', { x, y, width: w, height: h, rx: 3 });
    case 'io': {
      const k = 12;
      return s('polygon', { points: `${x + k},${y} ${x + w},${y} ${x + w - k},${y + h} ${x},${y + h}` });
    }
    case 'decision':
      return s('polygon', { points: `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}` });
  }
}

/** Draws a flowchart in chalk and lights up the step that is running. */
export class FlowView {
  readonly root: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private nodes = new Map<string, SVGGElement>();
  private edges: Array<{ el: SVGGElement; from: string; branch?: string }> = [];

  constructor(host: HTMLElement) {
    this.root = host;
  }

  set(chart: Flowchart | null, animate: boolean) {
    this.nodes.clear();
    this.edges = [];
    if (!chart) {
      this.svg?.remove();
      this.svg = null;
      return;
    }
    const svg = s('svg', { viewBox: `0 0 ${chart.width} ${chart.height}`, width: chart.width, height: chart.height, class: `flow${animate ? ' drawing' : ''}`, role: 'img', 'aria-label': 'Flowchart of the program' });
    svg.append(
      s('defs', {},
        s('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0,1 L10,5 L0,9', class: 'arrowhead' })),
        s('filter', { id: 'chalk', x: '-5%', y: '-5%', width: '110%', height: '110%' },
          s('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: 7, result: 'noise' }),
          s('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: 1.6 }),
        ),
      ),
    );
    const edgeLayer = s('g', { class: 'edges', filter: 'url(#chalk)' });
    chart.edges.forEach((e, i) => {
      const d = e.points.map(([x, y], k) => `${k ? 'L' : 'M'}${x},${y}`).join(' ');
      const g = s('g', { class: 'edge', style: `--i:${i}` }, s('path', { d, pathLength: 1, 'marker-end': 'url(#arrow)' }));
      if (e.label && e.points[1]) {
        const [x0, y0] = e.points[0]!;
        const [x1, y1] = e.points[1]!;
        const horizontal = y0 === y1;
        g.append(s('text', { x: horizontal ? (x0 + x1) / 2 : x0 + 8, y: horizontal ? y0 - 7 : (y0 + y1) / 2 + 4, class: 'edge-label', 'text-anchor': horizontal ? 'middle' : 'start' }, e.label));
      }
      edgeLayer.append(g);
      this.edges.push({ el: g, from: e.from, branch: e.branch });
    });
    const nodeLayer = s('g', { class: 'nodes' });
    chart.nodes.forEach((n, i) => {
      const g = s('g', { class: `node ${n.shape}`, style: `--i:${i}` }, shape(n), s('text', { x: n.x + n.w / 2, y: n.y + n.h / 2 + 4, 'text-anchor': 'middle' }, n.label));
      nodeLayer.append(g);
      this.nodes.set(n.id, g);
    });
    svg.append(edgeLayer, nodeLayer);
    this.svg?.remove();
    this.svg = svg;
    this.root.append(svg);
  }

  highlight(current: string | null, visited: Set<string>, branch: { from: string; branch: 'yes' | 'no' } | null, error = false) {
    for (const [id, g] of this.nodes) {
      g.classList.toggle('current', id === current);
      g.classList.toggle('visited', visited.has(id));
      g.classList.toggle('error', error && id === current);
    }
    for (const e of this.edges) e.el.classList.toggle('taken', !!branch && e.from === branch.from && e.branch === branch.branch);
    const node = current ? this.nodes.get(current) : null;
    if (node) {
      const box = node.getBoundingClientRect();
      const view = this.root.getBoundingClientRect();
      if (box.top < view.top + 20 || box.bottom > view.bottom - 20 || box.left < view.left || box.right > view.right) {
        this.root.scrollBy({ top: box.top - view.top - view.height / 2 + box.height / 2, left: box.left - view.left - view.width / 2 + box.width / 2, behavior: 'smooth' });
      }
    }
  }
}
