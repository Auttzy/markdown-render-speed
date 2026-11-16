// FastDrop round 3 — driver for markdown-render-speed-02.
// The harness runs `node /bot/main.ts` (Node 22, types stripped natively).
// It reads every case from cases.json in the input dir, renders each one
// alone with parse() from ./parse.js, and writes html.json to the output
// dir: a JSON array of the HTML strings, one per case, in the cases' order.
// Outside a container, MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR stand in
// for /input and /output.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8')) as { id: string; markdown: string }[];
const html = new Array<string>(cases.length);
for (let i = 0; i < cases.length; i++) html[i] = parse(cases[i].markdown);
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));
