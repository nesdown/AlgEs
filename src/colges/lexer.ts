export type TokenKind = 'word' | 'number' | 'string' | 'symbol' | 'newline' | 'indent' | 'dedent' | 'eof';

export interface Token {
  kind: TokenKind;
  text: string;
  line: number;
}

export class ColgesError extends Error {
  constructor(message: string, readonly line: number) {
    super(message);
    this.name = 'ColgesError';
  }
}

const SYMBOLS = ['==', '!=', '<=', '>=', '<-', '=', '<', '>', '+', '-', '*', '/', '%', '(', ')'];

/** Turns source into tokens, with indent and dedent tokens for blocks, as in Python. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const indents = [0];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.replace(/\t/g, '    ');
    const content = stripComment(text);
    if (!content.trim()) return;
    const width = content.length - content.trimStart().length;
    if (width > indents[indents.length - 1]!) {
      indents.push(width);
      tokens.push({ kind: 'indent', text: '', line });
    }
    while (width < indents[indents.length - 1]!) {
      indents.pop();
      tokens.push({ kind: 'dedent', text: '', line });
    }
    if (width !== indents[indents.length - 1]) throw new ColgesError('This line is indented differently from the lines above it.', line);

    let i = width;
    while (i < content.length) {
      const ch = content[i]!;
      if (ch === ' ') {
        i++;
        continue;
      }
      if (ch === "'" || ch === '"') {
        const end = content.indexOf(ch, i + 1);
        if (end < 0) throw new ColgesError('This text is missing its closing quote.', line);
        tokens.push({ kind: 'string', text: content.slice(i + 1, end), line });
        i = end + 1;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        const m = content.slice(i).match(/^[0-9]+/)!;
        tokens.push({ kind: 'number', text: m[0], line });
        i += m[0].length;
        continue;
      }
      if (/[\p{L}_]/u.test(ch)) {
        const m = content.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*/u)!;
        tokens.push({ kind: 'word', text: m[0], line });
        i += m[0].length;
        continue;
      }
      const symbol = SYMBOLS.find((s) => content.startsWith(s, i));
      if (!symbol) throw new ColgesError(`ColgEs does not know the symbol "${ch}".`, line);
      tokens.push({ kind: 'symbol', text: symbol, line });
      i += symbol.length;
    }
    tokens.push({ kind: 'newline', text: '', line });
  });

  const last = lines.length;
  while (indents.length > 1) {
    indents.pop();
    tokens.push({ kind: 'dedent', text: '', line: last });
  }
  tokens.push({ kind: 'eof', text: '', line: last });
  return tokens;
}

function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '#' || (ch === '/' && text[i + 1] === '/')) return text.slice(0, i);
  }
  return text;
}
