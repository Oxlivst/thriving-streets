// Makes the indicator illustrations the site shows: a WebP of each PNG in art/indicators/
// (indicator-NN.png and indicator-NN-faded.png), written to public/illustrations/indicators/.
// Every screen gets these (Scene.jsx, the wheel, the Enabling factors page).
//
// The PNGs are the source artwork, exported from Figma at 2x or more, each on its full
// component frame (the same frame as the slot in src/config/scenes.js, so the drawing lands
// where the layout expects; a PNG trimmed to its drawn edges would be stretched to fit).
//
// Each WebP is twice the size its drawing is shown at in the scene (sharp on high-resolution
// screens), or the PNG's own size if the indicator isn't in a scene yet.
//
// Runs before every `npm run dev` and `npm run build` (see package.json). A WebP is only
// remade when its PNG is newer, so this is quick after the first run.

import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { scenes } from '../src/config/scenes.js';

const root = resolve(import.meta.dirname, '..');
const srcDir = resolve(root, 'art/indicators');
const outDir = resolve(root, 'public/illustrations/indicators');
const DENSITY = 2; // screen pixels per scene pixel

// Indicator number → its slot width in a scene (scene px at scale 1).
const slotWidth = new Map(scenes.flatMap((scene) => scene.slots.map((slot) => [slot.indicator, slot.width])));

mkdirSync(outDir, { recursive: true });
let made = 0;
const files = readdirSync(srcDir).filter((f) => /^indicator-\d+(-faded)?\.png$/.test(f));
for (const file of files) {
  const input = resolve(srcDir, file);
  const output = resolve(outDir, file.replace(/\.png$/, '.webp'));
  if (existsSync(output) && statSync(output).mtimeMs >= statSync(input).mtimeMs) continue;
  const number = Number(file.match(/^indicator-(\d+)/)[1]);
  const { width: sourceWidth } = await sharp(input).metadata();
  const width = Math.min(sourceWidth, Math.ceil((slotWidth.get(number) ?? sourceWidth) * DENSITY));
  await sharp(input)
    .resize({ width })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(output);
  made += 1;
}
console.log(`✓ Illustration WebPs: ${made} made, ${files.length - made} up to date`);
