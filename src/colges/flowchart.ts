import { show, type Program, type Stmt } from './parser.js';

export type Shape = 'terminal' | 'process' | 'io' | 'decision';

export interface FlowNode {
  id: string;
  shape: Shape;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowEdge {
  /** Which decision and branch this edge follows, so a run can light it up. */
  from: string;
  branch?: 'yes' | 'no';
  label?: 'yes' | 'no';
  points: Array<[number, number]>;
}

export interface Flowchart {
  nodes: FlowNode[];
  edges: FlowEdge[];
  width: number;
  height: number;
}

const CHAR = 7.6;
const H = 40;
const DIAMOND_H = 58;
const GAP = 28;
const COLUMN_GAP = 36;
const LOOP_MARGIN = 24;
const PAD = 24;

interface Block {
  nodes: FlowNode[];
  edges: FlowEdge[];
  minX: number;
  maxX: number;
  height: number;
  /** The last node, for labelling the edge that leaves this block. */
  tail: string;
}

const widthFor = (label: string, min: number) => Math.max(min, Math.round(label.length * CHAR + 34));

function labelOf(s: Stmt): string {
  switch (s.kind) {
    case 'decl':
      return `${s.type} ${s.name} ← ${show(s.value)}`;
    case 'set':
      return `${s.name} ← ${show(s.value)}`;
    case 'write':
      return `print ${show(s.value)}`;
    case 'if':
    case 'while':
      return `${show(s.cond)} ?`;
  }
}

const shift = (b: Block, dx: number, dy: number): Block => ({
  ...b,
  nodes: b.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })),
  edges: b.edges.map((e) => ({ ...e, points: e.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) })),
  minX: b.minX + dx,
  maxX: b.maxX + dx,
});

function single(id: string, shape: Shape, label: string): Block {
  const w = widthFor(label, shape === 'terminal' ? 96 : 120);
  return { nodes: [{ id, shape, label, x: -w / 2, y: 0, w, h: H }], edges: [], minX: -w / 2, maxX: w / 2, height: H, tail: id };
}

function sequence(blocks: Block[]): Block {
  if (!blocks.length) return { nodes: [], edges: [], minX: 0, maxX: 0, height: 0, tail: '' };
  const out: Block = { nodes: [], edges: [], minX: Infinity, maxX: -Infinity, height: 0, tail: '' };
  let y = 0;
  blocks.forEach((b, i) => {
    if (i > 0) {
      out.edges.push({ from: out.tail, points: [[0, y], [0, y + GAP]] });
      y += GAP;
    }
    const placed = shift(b, 0, y);
    out.nodes.push(...placed.nodes);
    out.edges.push(...placed.edges);
    out.minX = Math.min(out.minX, placed.minX);
    out.maxX = Math.max(out.maxX, placed.maxX);
    y += b.height;
    out.tail = b.tail;
  });
  out.height = y;
  return out;
}

function decision(s: Stmt & { kind: 'if' }): Block {
  const label = labelOf(s);
  const w = widthFor(label, 130) + 30;
  const node: FlowNode = { id: s.id, shape: 'decision', label, x: -w / 2, y: 0, w, h: DIAMOND_H };
  const yes = layout(s.then);
  const no = layout(s.else ?? []);
  const leftX = -Math.max(w / 2, yes.maxX + COLUMN_GAP / 2);
  const rightX = Math.max(w / 2, -no.minX + COLUMN_GAP / 2);
  const top = DIAMOND_H + GAP;
  const branchHeight = Math.max(yes.height, no.height);
  const join = top + branchHeight + GAP;
  const mid = DIAMOND_H / 2;
  const edges: FlowEdge[] = [];
  const nodes = [node];

  const yesBlock = shift(yes, leftX, top);
  const noBlock = shift(no, rightX, top);
  nodes.push(...yesBlock.nodes, ...noBlock.nodes);
  edges.push(...yesBlock.edges, ...noBlock.edges);

  if (yes.nodes.length) {
    edges.push({ from: s.id, branch: 'yes', label: 'yes', points: [[-w / 2, mid], [leftX, mid], [leftX, top]] });
    edges.push({ from: yes.tail, points: [[leftX, top + yes.height], [leftX, join], [0, join]] });
  } else {
    edges.push({ from: s.id, branch: 'yes', label: 'yes', points: [[-w / 2, mid], [leftX, mid], [leftX, join], [0, join]] });
  }
  if (no.nodes.length) {
    edges.push({ from: s.id, branch: 'no', label: 'no', points: [[w / 2, mid], [rightX, mid], [rightX, top]] });
    edges.push({ from: no.tail, points: [[rightX, top + no.height], [rightX, join], [0, join]] });
  } else {
    edges.push({ from: s.id, branch: 'no', label: 'no', points: [[w / 2, mid], [rightX, mid], [rightX, join], [0, join]] });
  }
  return {
    nodes,
    edges,
    minX: Math.min(leftX + (yes.nodes.length ? yes.minX : 0), -w / 2),
    maxX: Math.max(rightX + (no.nodes.length ? no.maxX : 0), w / 2),
    height: join,
    tail: s.id,
  };
}

function loop(s: Stmt & { kind: 'while' }): Block {
  const label = labelOf(s);
  const w = widthFor(label, 130) + 30;
  const node: FlowNode = { id: s.id, shape: 'decision', label, x: -w / 2, y: 0, w, h: DIAMOND_H };
  const body = shift(layout(s.body), 0, DIAMOND_H + GAP);
  const bodyEnd = DIAMOND_H + GAP + (body.nodes.length ? body.height : 0);
  const mid = DIAMOND_H / 2;
  const leftX = Math.min(body.nodes.length ? body.minX : 0, -w / 2) - LOOP_MARGIN;
  const rightX = Math.max(body.nodes.length ? body.maxX : 0, w / 2) + LOOP_MARGIN;
  const back = bodyEnd + GAP / 2;
  const exit = bodyEnd + GAP;
  const edges: FlowEdge[] = [...body.edges];
  if (body.nodes.length) {
    edges.push({ from: s.id, branch: 'yes', label: 'yes', points: [[0, DIAMOND_H], [0, DIAMOND_H + GAP]] });
    edges.push({ from: body.tail, points: [[0, bodyEnd], [0, back], [leftX, back], [leftX, mid], [-w / 2, mid]] });
  } else {
    edges.push({ from: s.id, branch: 'yes', label: 'yes', points: [[0, DIAMOND_H], [0, back], [leftX, back], [leftX, mid], [-w / 2, mid]] });
  }
  edges.push({ from: s.id, branch: 'no', label: 'no', points: [[w / 2, mid], [rightX, mid], [rightX, exit], [0, exit]] });
  return { nodes: [node, ...body.nodes], edges, minX: leftX, maxX: rightX, height: exit, tail: s.id };
}

function layout(body: Stmt[]): Block {
  return sequence(
    body.map((s) => {
      switch (s.kind) {
        case 'if':
          return decision(s);
        case 'while':
          return loop(s);
        case 'write':
          return single(s.id, 'io', labelOf(s));
        default:
          return single(s.id, 'process', labelOf(s));
      }
    }),
  );
}

/** Lays out a program as a flowchart with the shapes of ISO 5807, the school standard. */
export function flowchart(program: Program): Flowchart {
  const chart = sequence([single('begin', 'terminal', 'Begin'), layout(program.body), single('end', 'terminal', 'End')].filter((b) => b.nodes.length));
  const dx = PAD - chart.minX;
  const placed = shift(chart, dx, PAD);
  return {
    nodes: placed.nodes,
    edges: placed.edges,
    width: Math.ceil(chart.maxX - chart.minX + PAD * 2),
    height: Math.ceil(chart.height + PAD * 2),
  };
}
