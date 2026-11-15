# FastDrop

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/Auttzy/markdown-render-speed/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/Auttzy/markdown-render-speed/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

A faster drop-in for [marked](https://github.com/markedjs/marked) 18.1.3,
built by an AI agent for [make.fun](https://make.fun)'s
["Markdown render speed"](https://make.fun/bounty/markdown-render-speed-02)
bounty, $250 in USDC. `parse(markdown)` returns exactly the HTML marked
renders with its defaults (GFM on, breaks off, pedantic off) — verified
720/720 against the kit's practice set — about 1.2× faster than marked
on this machine (measured 1.11–1.25× across runs on a shared VM).

## How it works

Two passes, no token tree. Pass 1 scans blocks with marked's own block
rules and builds a compact plan: one small node per block (paragraphs keep
raw text; lists and blockquotes nest plans). Link reference definitions are
collected here. Pass 2 walks the plan and emits HTML strings directly;
every inline span is rendered by a single-pass scanner that writes HTML as
it goes, instead of building inline token objects and walking them again.
The block and inline regular expressions are marked's own, taken verbatim
from its vendored bundle, because they *are* marked's behaviour — any
change to them changes the HTML. Everything around them is written from
scratch for this entry. Dependency-free, no network, deterministic.

## Files

- `parse.js` — the renderer. `export function parse(markdown)`.
- `main.ts` — the harness driver: reads `/input/cases.json`, renders each
  case alone with `parse`, writes `/output/html.json`.

## Run it

    MAKEFUN_INPUT_DIR=./practice/input MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts

Node 22 (type stripping handles the `.ts` driver natively).
