import { h } from './dom.js';

const KEYWORDS = /\b(algS|algE|if|then|else|while|do|wr|set|op|and|or|not)\b/gi;

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Colours a ColgEs line the way the 2016 Sublime Text plugin did: start and end, types, keywords, text. */
export function highlight(line: string): string {
  const comment = line.search(/#|\/\//);
  let code = line;
  let rest = '';
  if (comment >= 0 && !/['"][^'"]*$/.test(line.slice(0, comment))) {
    code = line.slice(0, comment);
    rest = line.slice(comment);
  }
  const parts = code.split(/('[^']*'?|"[^"]*"?)/);
  const html = parts
    .map((part, i) => {
      if (i % 2) return `<span class="t-str">${escape(part)}</span>`;
      return escape(part)
        .replace(/\b(int|str|bool)\b/g, '<span class="t-type">$1</span>')
        .replace(/\b([0-9]+)\b/g, '<span class="t-num">$1</span>')
        .replace(KEYWORDS, (m) => `<span class="${/^alg/i.test(m) ? 't-frame' : 't-key'}">${m}</span>`);
    })
    .join('');
  return html + (rest ? `<span class="t-com">${escape(rest)}</span>` : '');
}

/** A text area with a coloured copy underneath, so typing stays native and the code stays readable. */
export class Editor {
  readonly root: HTMLElement;
  readonly input: HTMLTextAreaElement;
  private readonly painted: HTMLElement;
  private readonly gutter: HTMLElement;
  private marks: { line: number; kind: 'run' | 'error' } | null = null;
  onChange: ((source: string) => void) | null = null;

  constructor(host: HTMLElement) {
    this.input = h('textarea', { id: 'code', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'ColgEs program' });
    this.painted = h('pre', { className: 'painted', 'aria-hidden': 'true' });
    this.gutter = h('div', { className: 'gutter', 'aria-hidden': 'true' });
    this.root = h('div', { className: 'editor' }, this.gutter, h('div', { className: 'code-area' }, this.painted, this.input));
    host.append(this.root);
    this.input.addEventListener('input', () => {
      this.paint();
      this.onChange?.(this.input.value);
    });
    this.input.addEventListener('scroll', () => {
      this.painted.scrollTop = this.input.scrollTop;
      this.painted.scrollLeft = this.input.scrollLeft;
      this.gutter.scrollTop = this.input.scrollTop;
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = this.input;
      this.input.value = `${value.slice(0, a)}  ${value.slice(b)}`;
      this.input.selectionStart = this.input.selectionEnd = a + 2;
      this.input.dispatchEvent(new Event('input'));
    });
  }

  get value() {
    return this.input.value;
  }

  set value(source: string) {
    this.input.value = source;
    this.paint();
  }

  mark(line: number | null, kind: 'run' | 'error' = 'run') {
    const next = line === null ? null : { line, kind };
    if (JSON.stringify(next) === JSON.stringify(this.marks)) return;
    this.marks = next;
    this.paint();
  }

  private paint() {
    const lines = this.input.value.split('\n');
    this.painted.innerHTML = lines
      .map((line, i) => {
        const cls = this.marks && this.marks.line === i + 1 ? ` class="line ${this.marks.kind}"` : ' class="line"';
        return `<span${cls}>${highlight(line) || ' '}</span>`;
      })
      .join('\n') + '\n';
    this.gutter.innerHTML = lines.map((_, i) => `<span${this.marks?.line === i + 1 ? ` class="${this.marks.kind}"` : ''}>${i + 1}</span>`).join('');
  }
}
