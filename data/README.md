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
| | | |
