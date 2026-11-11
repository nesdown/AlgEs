import { ColgesError, tokenize, type Token } from './lexer.js';

export type Type = 'int' | 'str' | 'bool';

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '-' | 'not'; arg: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr };

interface Base {
  id: string;
  line: number;
}

export type Stmt =
  | (Base & { kind: 'decl'; type: Type; name: string; value: Expr })
  | (Base & { kind: 'set'; name: string; value: Expr })
  | (Base & { kind: 'write'; value: Expr })
  | (Base & { kind: 'if'; cond: Expr; then: Stmt[]; else: Stmt[] | null })
  | (Base & { kind: 'while'; cond: Expr; body: Stmt[] });

export interface Program {
  body: Stmt[];
  /** True when the source used algS and algE. */
  framed: boolean;
}

const STATEMENT_WORDS = new Set(['algs', 'alge', 'int', 'str', 'bool', 'set', 'op', 'wr', 'if', 'while', 'else', 'then', 'do']);
const PRECEDENCE: Record<string, number> = {
  or: 1, and: 2,
  '=': 3, '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5, '%': 5,
};

export function parse(source: string): Program {
  const tokens = tokenize(source);
  let at = 0;
  let ids = 0;
  let framed = false;

  const peek = (offset = 0): Token => tokens[Math.min(at + offset, tokens.length - 1)]!;
  const next = (): Token => tokens[at++]!;
  const word = (t: Token) => (t.kind === 'word' ? t.text.toLowerCase() : '');
  const isWord = (w: string, t = peek()) => word(t) === w;
  const skipNewlines = () => {
    while (peek().kind === 'newline') next();
  };
  const expectWord = (w: string, hint: string) => {
    if (!isWord(w)) throw new ColgesError(hint, peek().line);
    next();
  };
  const describe = (t: Token) =>
    t.kind === 'newline' || t.kind === 'eof' ? 'the end of the line' : t.kind === 'string' ? `'${t.text}'` : `"${t.text}"`;

  function expr(min = 0): Expr {
    let left = unary();
    for (;;) {
      const t = peek();
      const op = t.kind === 'symbol' ? t.text : word(t);
      const power = PRECEDENCE[op];
      if (power === undefined || power <= min) return left;
      next();
      left = { kind: 'binary', op: op === '==' ? '=' : op, left, right: expr(power) };
    }
  }

  function unary(): Expr {
    const t = peek();
    if (t.kind === 'symbol' && t.text === '-') {
      next();
      return { kind: 'unary', op: '-', arg: unary() };
    }
    if (isWord('not')) {
      next();
      return { kind: 'unary', op: 'not', arg: expr(2) };
    }
    return primary();
  }

  function primary(): Expr {
    const t = next();
    if (t.kind === 'number') return { kind: 'num', value: Number(t.text) };
    if (t.kind === 'string') return { kind: 'str', value: t.text };
    if (t.kind === 'symbol' && t.text === '(') {
      const inner = expr();
      const close = next();
      if (close.text !== ')') throw new ColgesError('A bracket was opened here but never closed.', t.line);
      return inner;
    }
    if (t.kind === 'word') {
      const w = word(t);
      if (w === 'true' || w === 'false') return { kind: 'bool', value: w === 'true' };
      if (w === 'op') return expr(); // 2016 style: "if op a > 12".
      if (STATEMENT_WORDS.has(w)) throw new ColgesError(`Expected a value, but found "${t.text}".`, t.line);
      return { kind: 'var', name: t.text };
    }
    throw new ColgesError(`Expected a value, but found ${describe(t)}.`, t.line);
  }

  function name(hint: string): Token {
    const t = next();
    if (t.kind !== 'word' || STATEMENT_WORDS.has(word(t))) throw new ColgesError(hint, t.line);
    return t;
  }

  /** A block is an indented group of lines, or a single statement on the same line. */
  function branch(line: number): Stmt[] {
    if (peek().kind === 'newline') {
      skipNewlines();
      if (peek().kind !== 'indent') throw new ColgesError('Indent the lines that belong to this block.', line);
      next();
      const body = statements(() => peek().kind === 'dedent' || peek().kind === 'eof');
      if (peek().kind === 'dedent') next();
      return body;
    }
    const one = statement();
    return one ? [one] : [];
  }

  function statement(): Stmt | null {
    const t = peek();
    const w = word(t);
    const line = t.line;
    const id = `s${ids++}`;
    switch (w) {
      case 'algs':
        next();
        framed = true;
        return null;
      case 'alge':
        next();
        return null;
      case 'int':
      case 'str':
      case 'bool': {
        next();
        const n = name(`Give the new ${w} a name, like: ${w} count ${w === 'str' ? "'hi'" : w === 'bool' ? 'true' : '0'}`);
        if (peek().kind === 'symbol' && (peek().text === '=' || peek().text === '<-')) next();
        return { kind: 'decl', id, line, type: w, name: n.text, value: expr() };
      }
      case 'set': {
        next();
        const n = name('Say which variable to change, like: set count count + 1');
        if (peek().kind === 'symbol' && (peek().text === '=' || peek().text === '<-')) next();
        return { kind: 'set', id, line, name: n.text, value: expr() };
      }
      case 'op': {
        // 2016 style: "op a * 5" means a ← a * 5.
        next();
        const n = name('After op, name a variable, like: op a + 1');
        const symbol = next();
        if (!['+', '-', '*', '/', '%'].includes(symbol.text)) throw new ColgesError(`op needs + - * / or %, not ${describe(symbol)}.`, line);
        const value: Expr = { kind: 'binary', op: symbol.text, left: { kind: 'var', name: n.text }, right: expr(PRECEDENCE[symbol.text]) };
        return { kind: 'set', id, line, name: n.text, value };
      }
      case 'wr':
        next();
        return { kind: 'write', id, line, value: expr() };
      case 'if': {
        next();
        const cond = expr();
        expectWord('then', 'An if needs "then" after the condition, like: if a > 3 then');
        const thenBody = branch(line);
        skipNewlines();
        let elseBody: Stmt[] | null = null;
        if (isWord('else')) {
          next();
          elseBody = branch(line);
        }
        return { kind: 'if', id, line, cond, then: thenBody, else: elseBody };
      }
      case 'while': {
        next();
        const cond = expr();
        expectWord('do', 'A while needs "do" after the condition, like: while a < 10 do');
        return { kind: 'while', id, line, cond, body: branch(line) };
      }
      case 'else':
        throw new ColgesError('This else has no matching if above it.', line);
    }
    if (t.kind === 'word' && peek(1).kind === 'symbol' && (peek(1).text === '=' || peek(1).text === '<-')) {
      next();
      next();
      return { kind: 'set', id, line, name: t.text, value: expr() };
    }
    if (t.kind === 'word') throw new ColgesError(`ColgEs does not know "${t.text}". Lines start with int, str, bool, set, op, wr, if or while.`, line);
    throw new ColgesError(`Did not expect ${describe(t)} here.`, line);
  }

  function statements(stop: () => boolean, top = false): Stmt[] {
    const body: Stmt[] = [];
    let previous = '';
    for (;;) {
      skipNewlines();
      if (stop()) return body;
      // Lines inside algS ... algE are usually indented, as in every 2016 example.
      if (top && peek().kind === 'indent' && previous === 'algs') {
        next();
        continue;
      }
      if (top && peek().kind === 'dedent') {
        next();
        continue;
      }
      previous = word(peek());
      if (peek().kind === 'indent') throw new ColgesError('This line is indented, but there is no if or while above it.', peek().line);
      const s = statement();
      if (s) body.push(s);
    }
  }

  const body = statements(() => peek().kind === 'eof', true);
  return { body, framed };
}

export function show(e: Expr, parent = 0): string {
  switch (e.kind) {
    case 'num':
      return String(e.value);
    case 'str':
      return `'${e.value}'`;
    case 'bool':
      return String(e.value);
    case 'var':
      return e.name;
    case 'unary':
      return e.op === '-' ? `-${show(e.arg, 9)}` : `not ${show(e.arg, 9)}`;
    case 'binary': {
      const p = PRECEDENCE[e.op] ?? 0;
      const text = `${show(e.left, p)} ${e.op === '=' ? '=' : e.op} ${show(e.right, p + 1)}`;
      return p < parent ? `(${text})` : text;
    }
  }
}
