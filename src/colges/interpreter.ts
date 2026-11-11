import { ColgesError } from './lexer.js';
import { parse, show, type Expr, type Program, type Stmt, type Type } from './parser.js';

type Value = number | string | boolean;

export interface Variable {
  name: string;
  type: Type;
  value: Value;
}

export interface RunStep {
  /** Flowchart node: a statement id, "begin" or "end". */
  node: string;
  line: number;
  note: string;
  vars: Variable[];
  output: string[];
  /** For decisions: which way the program went. */
  branch?: 'yes' | 'no';
  changed?: string;
}

export interface RunResult {
  program: Program | null;
  steps: RunStep[];
  output: string[];
  error: ColgesError | null;
}

export const STEP_LIMIT = 2000;

const typeOf = (v: Value): Type => (typeof v === 'number' ? 'int' : typeof v === 'string' ? 'str' : 'bool');
const TYPE_WORD: Record<Type, string> = { int: 'a number', str: 'text', bool: 'true or false' };
const display = (v: Value) => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));

/** Runs a ColgEs program and records every step, so it can be replayed on the flowchart. */
export function run(source: string): RunResult {
  let program: Program;
  try {
    program = parse(source);
  } catch (err) {
    if (err instanceof ColgesError) return { program: null, steps: [], output: [], error: err };
    throw err;
  }

  const vars = new Map<string, Variable>();
  const output: string[] = [];
  const steps: RunStep[] = [];
  const snap = (node: string, line: number, note: string, extra: Partial<RunStep> = {}) => {
    if (steps.length >= STEP_LIMIT) {
      throw new ColgesError(`Stopped after ${STEP_LIMIT} steps. Is there a loop that never ends?`, line);
    }
    steps.push({ node, line, note, vars: [...vars.values()].map((v) => ({ ...v })), output: [...output], ...extra });
  };

  const evaluate = (e: Expr, line: number): Value => {
    switch (e.kind) {
      case 'num':
      case 'str':
      case 'bool':
        return e.value;
      case 'var': {
        const v = vars.get(e.name);
        if (!v) throw new ColgesError(`"${e.name}" has not been created yet. Create it first, like: int ${e.name} 0`, line);
        return v.value;
      }
      case 'unary': {
        const a = evaluate(e.arg, line);
        if (e.op === '-') {
          if (typeof a !== 'number') throw new ColgesError(`Only numbers can be negative, not ${TYPE_WORD[typeOf(a)]}.`, line);
          return -a;
        }
        if (typeof a !== 'boolean') throw new ColgesError(`"not" works on true or false, not ${TYPE_WORD[typeOf(a)]}.`, line);
        return !a;
      }
      case 'binary': {
        const a = evaluate(e.left, line);
        if (e.op === 'and' || e.op === 'or') {
          if (typeof a !== 'boolean') throw new ColgesError(`"${e.op}" joins true or false values.`, line);
          if (e.op === 'and' && !a) return false;
          if (e.op === 'or' && a) return true;
          const b = evaluate(e.right, line);
          if (typeof b !== 'boolean') throw new ColgesError(`"${e.op}" joins true or false values.`, line);
          return b;
        }
        const b = evaluate(e.right, line);
        if (e.op === '+' && (typeof a === 'string' || typeof b === 'string')) return display(a) + display(b);
        if (e.op === '=') return a === b;
        if (e.op === '!=') return a !== b;
        if (['<', '>', '<=', '>='].includes(e.op)) {
          if (typeOf(a) !== typeOf(b) || typeof a === 'boolean') {
            throw new ColgesError(`Cannot compare ${TYPE_WORD[typeOf(a)]} with ${TYPE_WORD[typeOf(b)]}.`, line);
          }
          return e.op === '<' ? a < b : e.op === '>' ? a > b : e.op === '<=' ? a <= b : a >= b;
        }
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new ColgesError(`"${e.op}" works on numbers, not ${TYPE_WORD[typeOf(typeof a !== 'number' ? a : b)]}.`, line);
        }
        if ((e.op === '/' || e.op === '%') && b === 0) throw new ColgesError('Cannot divide by zero.', line);
        switch (e.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return Math.trunc(a / b);
          case '%': return a % b;
        }
        throw new ColgesError(`Unknown operator ${e.op}.`, line);
      }
    }
  };

  const coerce = (value: Value, type: Type, name: string, line: number): Value => {
    // 2016 programs wrote "bool c 1".
    if (type === 'bool' && typeof value === 'number' && (value === 0 || value === 1)) return value === 1;
    if (typeOf(value) !== type) {
      throw new ColgesError(`${name} holds ${TYPE_WORD[type]}, so it cannot take ${TYPE_WORD[typeOf(value)]} (${display(value)}).`, line);
    }
    return value;
  };

  const exec = (body: Stmt[]): void => {
    for (const s of body) {
      switch (s.kind) {
        case 'decl': {
          if (vars.has(s.name)) throw new ColgesError(`${s.name} already exists. To change it, write: set ${s.name} ...`, s.line);
          const value = coerce(evaluate(s.value, s.line), s.type, s.name, s.line);
          vars.set(s.name, { name: s.name, type: s.type, value });
          snap(s.id, s.line, `Create ${s.name} = ${display(value)}.`, { changed: s.name });
          break;
        }
        case 'set': {
          const v = vars.get(s.name);
          if (!v) throw new ColgesError(`"${s.name}" has not been created yet. Create it first, like: int ${s.name} 0`, s.line);
          v.value = coerce(evaluate(s.value, s.line), v.type, s.name, s.line);
          snap(s.id, s.line, `${s.name} becomes ${display(v.value)}.`, { changed: s.name });
          break;
        }
        case 'write': {
          const text = display(evaluate(s.value, s.line));
          output.push(text);
          snap(s.id, s.line, `Print ${text}.`);
          break;
        }
        case 'if': {
          const c = evaluate(s.cond, s.line);
          if (typeof c !== 'boolean') throw new ColgesError(`An if needs a condition that is true or false, like a > 3. Got ${display(c)}.`, s.line);
          snap(s.id, s.line, `${show(s.cond)} is ${display(c)}, so go ${c ? 'the yes way' : 'the no way'}.`, { branch: c ? 'yes' : 'no' });
          if (c) exec(s.then);
          else if (s.else) exec(s.else);
          break;
        }
        case 'while': {
          for (;;) {
            const c = evaluate(s.cond, s.line);
            if (typeof c !== 'boolean') throw new ColgesError(`A while needs a condition that is true or false. Got ${display(c)}.`, s.line);
            snap(s.id, s.line, c ? `${show(s.cond)} is true, so go round again.` : `${show(s.cond)} is false, so leave the loop.`, { branch: c ? 'yes' : 'no' });
            if (!c) break;
            exec(s.body);
          }
          break;
        }
      }
    }
  };

  try {
    snap('begin', 1, 'Begin.');
    exec(program.body);
    snap('end', steps.at(-1)?.line ?? 1, 'End.');
    return { program, steps, output, error: null };
  } catch (err) {
    if (err instanceof ColgesError) return { program, steps, output, error: err };
    throw err;
  }
}
