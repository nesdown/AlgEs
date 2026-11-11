<h1 align="center">AlgEs</h1>
<p align="center"><strong>Learn an algorithm five ways.</strong><br>Watch it, predict it, be it, race it, and write your own in a language that draws itself as a flowchart.</p>

AlgEs began in 2016 as a 10th-grade project at the Dnipro Technical Lyceum in Kyiv: a Java app for learning to write algorithms and draw them as flowcharts, with its own small language, ColgEs. This is the same idea, rebuilt for the browser.

## Five ways to learn

| Mode | You | Why it works |
|---|---|---|
| **Watch** | Step through, forwards and back, with the pseudocode line lit and every step explained | See the whole idea before the details |
| **Predict** | The run pauses six times and asks what happens next | Guessing before seeing is how it sticks |
| **Do** | Make every decision yourself: swap or keep, which bar, which cell | You only understand it once you can do it |
| **Race** | Two algorithms on the same input, step for step | O(n²) against O(n log n) stops being abstract |
| **Build** | Write ColgEs and watch it become a flowchart and run | From reading algorithms to writing them |

## Algorithms

**Sorting:** bubble, selection, insertion, merge, quick, heap. Inputs can be random, nearly sorted, reversed or few unique.
**Searching:** linear, binary.
**Pathfinding:** breadth-first, depth-first, Dijkstra, A*, greedy best-first. Draw walls and mud on the board and drag the start and goal.

Progress is saved in the browser: three dots per algorithm for watched, predicted and done.

## ColgEs

The 2016 language, finished. Programs from back then still run unchanged, including the one-line saved files.

```
algS
  int n 5
  while n > 0 do
    wr n
    set n n - 1
  wr 'Liftoff!'
algE
```

| | |
|---|---|
| `algS` … `algE` | Start and end (optional) |
| `int a 13`, `str s 'hi'`, `bool b true` | Typed variables |
| `set a a * 5`, `a = a * 5`, `op a * 5` | Change a value. `op` is the 2016 form |
| `wr a` | Print |
| `if a > 12 then` … `else` … | Branch, as an indented block or on one line |
| `while a > 0 do` … | Loop. It was commented out in 2016 |
| `+ - * / %`, `= != < > <= >=`, `and or not` | Integer maths, comparison, logic |

Errors name the line and say what to do. Flowcharts use the ISO 5807 shapes taught in school.

## Run it

```bash
pnpm install
pnpm build      # writes dist/index.html, one self-contained page
pnpm test       # every algorithm, every question, the language and flowchart layout
```

Open `dist/index.html` in a browser, or put it on any static host such as GitHub Pages. `pnpm dev` rebuilds as you edit.

## How it is built

TypeScript with no runtime dependencies. Every algorithm records a full trace of snapshots, so playback can scrub both ways, and each decision point carries its question and its answer. Predict and Do are built on those same decision points. The tests check that every question's answer is what the algorithm then actually does, and that every pathfinder matches a brute-force shortest path.

```
src/algorithms   sorting, searching and pathfinding, each one a trace
src/colges       tokenizer, parser, interpreter, flowchart layout
src/ui           bars, board, flowchart, editor, the five modes
test             the engine and language tests
```

GPL-3.0, as the original. Made by Bohdan Hlushko, Kyiv 2016 and Chicago 2026.
