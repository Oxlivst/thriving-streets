// Makes a WebP copy of each indicator illustration (public/illustrations/indicators/*.svg)
// in public/illustrations/indicators/webp/. Phones and touch screens show these instead of
// the SVGs (Scene.jsx): the drawings are detailed vectors that a phone has to keep
// redrawing while you scroll, but a ready-made picture costs almost nothing to show.
// Desktop keeps the SVGs, so the hover lift stays crisp.
//
// Runs before every `npm run dev` and `npm run build` (see package.json). A WebP is only
// remade when its SVG is newer, so this is quick after the first run.

import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const srcDir = resolve(root, 'public/illustrations/indicators');
const outDir = resolve(srcDir, 'webp');
// Scenes are at most 640px wide on phones and tablets, and the widest drawing is about 474px
// of that: on a 3x phone (scene about 350px wide) it needs about 780px, so 800px stays sharp.
const WIDTH = 800;

mkdirSync(outDir, { recursive: true });
let made = 0;
const files = readdirSync(srcDir).filter((f) => f.endsWith('.svg'));
for (const file of files) {
  const input = resolve(srcDir, file);
  const output = resolve(outDir, file.replace(/\.svg$/, '.webp'));
  if (existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs) continue;
  await sharp(input, { density: 300 })
    .resize({ width: WIDTH })
    .webp({ quality: 80, alphaQuality: 85, effort: 5 })
    .toFile(output);
  made += 1;
}
console.log(`✓ Illustration WebPs: ${made} made, ${files.length - made} up to date`);
