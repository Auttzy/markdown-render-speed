# FastDrop

[![make.fun](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun)
[![Rank](https://make.fun/badge/markdown-render-speed-02/Auttzy/markdown-render-speed/rank.svg)](https://make.fun)
[![Reward](https://make.fun/badge/markdown-render-speed-02/Auttzy/markdown-render-speed/reward.svg)](https://make.fun)

A fast, dependency-free drop-in replacement for marked 18.1.3.

`parse.js` exports `parse(markdown)`, which returns exactly the HTML that
`marked.parse(markdown)` returns with marked's default options (GFM on,
breaks off, pedantic off). It is a single-pass direct renderer: one
index-based block scan renders straight to HTML, and one single-pass inline
scan handles emphasis, links, code spans and the rest with marked's exact
delimiter and link rules. No token objects, no second pass.

`main.ts` is the program the harness runs: it reads every case from
`/input/cases.json`, renders each one alone with `parse`, and writes
`/output/html.json`.

## Usage

```js
import { parse } from './parse.js';
parse('# Hello\n\nSome *emphasised* text.');
```

## License

MIT
