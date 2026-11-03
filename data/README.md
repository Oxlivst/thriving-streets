# Data

CSV files that drive the site's data components. During the build each CSV becomes JSON in `src/data/`, so editing a CSV and rebuilding updates the site.

## Rules

- The first row holds column headers in `snake_case`, e.g. `theme_name`.
- Save files as UTF-8 CSV. In Excel, use **File → Save As → CSV UTF-8**.
- Separate lists inside a cell with `;`, e.g. `walking;cycling;buses`.
- Don't rename or remove columns without updating the build spec (§6). The build stops with an error if a required column is missing.

## Files

List each file here once it's added:

| File | What it holds | Used on |
| --- | --- | --- |
| `indicator-mapping.csv` | 20 cornerstone indicators mapped against 6 themes and 26 factors, with workshop quotes | Themes & factors (TBC in spec §6–7) |

### indicator-mapping.csv

Exported from the Google Sheet *FSO_Indicator Mapping and Assessments*, tab *Indicator_mapping_against_themes*. To update it, export that tab as CSV, rename the file to `indicator-mapping.csv`, and replace this one. **Keep the sheet's layout exactly as it is.** The build script reads this layout directly, so it is the one exception to the rules above:

| Row | Content |
| --- | --- |
| 1 | Notes about the sheet (ignored) |
| 2 | Theme names, each in the first column of its group of factors |
| 3 | Factor names (26 columns, from column C) |
| 4 (`0.`) | A description of each factor, drawn from the workshops |
| 5 onwards (`1.`–`20.`) | One indicator per row: number in column A, indicator text in column B, then one cell per factor |

The number in column A also names the indicator's illustration (`1.` → `public/illustrations/indicators/indicator-01.svg`). If you reorder indicators in the sheet, rename the illustration files to match.

Each factor cell is empty, or starts with a tick followed by bullet-point quotes (`•`):

- `✓✓` = strong and direct association with the factor
- `✓` = the factor is implied by the indicator
