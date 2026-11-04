// Converts data/indicator-mapping.csv into src/data/indicators.json.
// Runs before every `npm run dev` and `npm run build` (see package.json).
// The CSV keeps the Google Sheet's layout; data/README.md documents it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const root = resolve(import.meta.dirname, '..');
const inputPath = resolve(root, 'data/indicator-mapping.csv');
const outputDir = resolve(root, 'src/data');
const outputPath = resolve(outputDir, 'indicators.json');

// Long theme names in the sheet → short keys used for colour tokens (spec §6.2).
const THEME_KEYS = {
  'Social Connection and Belonging': 'social-connection',
  'Freedom to Move': 'freedom-to-move',
  'Living with Nature': 'living-with-nature',
  'Healthy Lives': 'healthy-lives',
  'Economic Vitality and Local Character': 'economic-vitality',
  'Community Governance and Agency': 'community-agency',
};

// Sheet layout: row index (0-based) of each part, first factor column.
const THEME_ROW = 1;
const FACTOR_ROW = 2;
const DESCRIPTION_ROW = 3;
const FIRST_INDICATOR_ROW = 4;
const FIRST_FACTOR_COL = 2;

function fail(message) {
  console.error(`\n✗ indicator-mapping.csv: ${message}\n`);
  process.exit(1);
}

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const clean = (text) => text.replace(/\s+/g, ' ').trim();

// A mapping cell: any tick ("✓"; an older "✓✓" counts the same), optionally followed
// by "• quote" lines. Every ticked factor is shown on the wheel.
function parseCell(cell) {
  const text = cell.trim();
  if (!text.startsWith('✓')) return null;
  const quotes = text
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) => clean(line.replace(/^\s*•/, '')));
  return { quotes };
}

const rows = parse(readFileSync(inputPath, 'utf8'), { relax_column_count: true });

// ----- Themes and factors -------------------------------------------------
const themes = [];
const factorColumns = []; // one entry per factor column: { themeKey, factorKey }
let currentTheme = null;

for (let col = FIRST_FACTOR_COL; col < rows[FACTOR_ROW].length; col++) {
  const themeName = clean(rows[THEME_ROW][col] ?? '');
  if (themeName) {
    const key = THEME_KEYS[themeName];
    if (!key) fail(`unknown theme "${themeName}" in row 2. Add it to THEME_KEYS in scripts/csv-to-json.mjs.`);
    currentTheme = { key, name: themeName, factors: [] };
    themes.push(currentTheme);
  }
  const factorName = clean(rows[FACTOR_ROW][col] ?? '');
  if (!factorName) continue;
  if (!currentTheme) fail(`factor "${factorName}" has no theme above it.`);

  const factor = {
    key: slug(factorName),
    name: factorName,
    description: clean(rows[DESCRIPTION_ROW][col] ?? ''),
  };
  currentTheme.factors.push(factor);
  factorColumns[col] = { themeKey: currentTheme.key, factorKey: factor.key, factorName: factor.name };
}

// ----- Indicators -----------------------------------------------------------
const indicators = [];
const seen = new Set();
const missingArt = [];

for (const row of rows.slice(FIRST_INDICATOR_ROW)) {
  const number = parseInt(row[0], 10);
  if (Number.isNaN(number)) continue;
  if (seen.has(number)) fail(`indicator number ${number} appears twice.`);
  seen.add(number);

  const padded = String(number).padStart(2, '0');
  const mappings = [];
  for (let col = FIRST_FACTOR_COL; col < row.length; col++) {
    const cell = parseCell(row[col] ?? '');
    if (cell && factorColumns[col]) {
      const { themeKey, factorKey, factorName } = factorColumns[col];
      mappings.push({ theme: themeKey, factor: factorKey, factorName, ...cell });
    }
  }

  const indicator = {
    number,
    text: clean(row[1] ?? ''),
    illustration: `illustrations/indicators/indicator-${padded}.svg`,
    illustrationFaded: `illustrations/indicators/indicator-${padded}-faded.svg`,
    // WebP copies for phones and touch screens (scripts/illustrations-to-webp.mjs).
    illustrationWebp: `illustrations/indicators/webp/indicator-${padded}.webp`,
    illustrationFadedWebp: `illustrations/indicators/webp/indicator-${padded}-faded.webp`,
    mappings,
  };

  if (!mappings.length) {
    fail(`indicator ${number} ("${indicator.text}") has no ticked (✓) factor, so its wheel would be empty.`);
  }
  if (!existsSync(resolve(root, 'public', indicator.illustration))) missingArt.push(number);
  indicators.push(indicator);
}

if (missingArt.length) {
  console.warn(`! No illustration yet for indicator(s) ${missingArt.join(', ')}`);
}

indicators.sort((a, b) => a.number - b.number);

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify({ themes, indicators }, null, 2) + '\n');
console.log(`✓ ${themes.length} themes, ${factorColumns.filter(Boolean).length} factors, ${indicators.length} indicators → src/data/indicators.json`);
