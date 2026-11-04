# Thriving Streets

A microsite presenting a vision for thriving streets and neighbourhoods in Oxfordshire.

- **Build spec:** [Thriving Streets Microsite — Build Spec](https://claude.ai/artifact/T4GtxPYT4c6uy5LUceiCS9)
- **Designs:** [Oxfordshire Future Streets (Figma)](https://www.figma.com/design/GgTp2DtbW3z0L5GG4Leabb/Oxfordshire-Future-Streets)

> Status: landing page built up to scene 1 (desktop).

## Run it locally

Needs [Node.js](https://nodejs.org) 20 or later.

```bash
npm install
npm run dev      # http://localhost:5173, rebuilds data from data/*.csv first
npm run build    # static site in dist/
```

## Publishing

Every push to `main` builds the site and publishes it to GitHub Pages at https://thrivingstreets.oxfordshireliveablestreets.org (see `.github/workflows/deploy.yml`). The subdomain is a CNAME record in Squarespace's DNS pointing at `oxlivst.github.io`, with the custom domain set in the repo's Settings → Pages. Progress shows in the repo's **Actions** tab.

The Pages source must be set to **GitHub Actions** (Settings → Pages). Publishing straight from the branch serves unbuilt source files, and the indicator data won't load.

## Where to change things

| To change… | Edit |
| --- | --- |
| Colours, fonts, type sizes | `src/styles/tokens.css` |
| Indicator data (themes, factors, mappings) | `data/indicator-mapping.csv`, then rebuild |
| Scene compositions (illustration positions, halos) | `src/config/scenes.js` |
| Wheel theme order and ring labels | `src/config/themes.js` |
| Hero and page text | `index.html` |

## Where things go

| Folder | What goes in it | Who edits it |
| --- | --- | --- |
| `public/illustrations/` | Final SVG/PNG illustrations exported from Figma | Designer (upload) |
| `public/icons/` | UI icons (SVG) | Designer (upload) |
| `public/images/` | Photos, partner logos, social share image, favicon | Designer (upload) |
| `public/fonts/` | Self-hosted font files | Developer |
| `data/` | CSV files that drive data components | Content editors |
| `design/` | Reference only, not published: storyboards, screen recordings, export notes | Designer |
| `src/` | Site code: styles, scripts, React components | Developer |
| `scripts/` | Build scripts, e.g. CSV → JSON | Developer |

Each upload folder has its own README with naming rules.

## Uploading files on GitHub

1. Open the folder on github.com, e.g. `public/illustrations`.
2. Click **Add file → Upload files**, then drag your files in.
3. Write a short note (e.g. "Add vision hero illustrations"), and click **Commit changes**.
