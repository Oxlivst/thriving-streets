# Illustrations

Final illustrations exported from Figma. Everything here is published with the site.

## Format

- **SVG** for flat, vector illustrations, and always for illustrations with hotspots, hover states or animated parts.
- **PNG at 2x** for textured or painterly artwork. These get converted to WebP/AVIF in different sizes during the build.
- Don't embed images inside an SVG. Export those parts as separate PNGs.

## SVG export settings (Figma)

- Turn on **Include "id" attribute**, so layer names become IDs in the code.
- Outline text, unless it needs to stay selectable.
- No need to optimise the files: that happens during the build.

## Naming

`<page>-<section>-<name>-<variant>.<ext>`, all lowercase, words joined with hyphens.

- `page`: `vision`, `themes` or `about` (`shared` if used on several pages)
- `variant`: `desktop` or `mobile`. Leave it off if one file works for both.

Examples: `vision-hero-street-desktop.svg`, `vision-hero-street-mobile.svg`, `themes-healthy-lives-icon.svg`

## Indicator illustrations

Each of the 20 indicators in `data/indicator-mapping.csv` has one illustration, in `indicators/`. Name each file after the indicator's number (column A of the CSV), with two digits:

`indicators/indicator-01.svg` … `indicators/indicator-20.svg`

Each illustration also needs a **faded version**, shown while another illustration is hovered or selected: `indicator-01-faded.svg`. The site swaps the files rather than lowering opacity, so export the faded artwork as designed.

Add `-mobile` for a mobile version, e.g. `indicator-01-mobile.svg`. The site finds each illustration from its number, so if indicators are renumbered in the sheet, rename the files to match.

## Interactive layers

Give interactive layers a prefix in Figma, so they can be wired up by ID:

- `hotspot-<name>`: clickable or tappable area, e.g. `hotspot-cycle-lane`
- `anim-<name>`: animated part, e.g. `anim-tree-sway`

Describe what each one does in §8 of the build spec, using its interaction ID (e.g. `INT-03`).
