# Forest Inventory

A browser-based, mobile-friendly field tool for running fixed-radius forest inventory plots. Built as a portfolio project for Samuel F. Holmes (BS Natural Resources & Environment, Sewanee 2026).

**Status:** Skeleton build (v0.1). Features under development.

## What it does

Implements a fixed-radius forest inventory plot protocol:

- Captures plot establishment data (GPS, slope, aspect, forest community type, disturbance evidence)
- Records tree-by-tree data within plot radius (species, DBH, crown class, condition)
- Documents understory, regeneration, and ground cover
- Captures cardinal-direction photos at plot center
- Computes per-plot metrics (trees per acre, basal area per acre, species composition)
- Aggregates project-level summaries across multiple plots
- Exports raw data as CSV, plot locations as GeoJSON, and project summaries as PDF

Designed for fieldwork with intermittent connectivity. Installs as a Progressive Web App on phones and tablets; works fully offline once the app shell is cached.

## Methodology

The fixed-radius plot protocol implemented here is a standard forest inventory method used by the USFS Forest Inventory and Analysis (FIA) program, state forestry agencies, and consulting foresters. Default plot radius is 1/10 acre (37.2 ft); configurable per project. DBH threshold is configurable per project (default 5 in). The app is regionally configurable — v1 ships with reference species lists for the North Carolina Piedmont and the Southern Appalachian / Cumberland Plateau.

Detailed methodology references will be added in `docs/methodology.md` during development.

## Tech stack

- Vanilla HTML, CSS, JavaScript (ES modules — no build step)
- IndexedDB via [Dexie](https://dexie.org/) for local persistence
- Service Worker for offline app shell caching
- Web App Manifest for PWA installation
- Hosted on GitHub Pages (HTTPS — required for Geolocation and camera APIs)

The only external runtime dependency is Dexie, loaded from a CDN.

## Local development

No build step. Clone the repo, serve the directory over HTTPS or `localhost`, and open `index.html`.

```bash
# Simplest local dev server (Python)
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. (Service worker registration and Geolocation will not work over `file://` — a server is required.)

## Repo layout

```
/
├── index.html                  Main entry
├── manifest.webmanifest        PWA manifest
├── service-worker.js           Offline shell caching
├── /css                        Styles
├── /js
│   ├── app.js                  Entry point
│   ├── db.js                   Dexie schema and queries
│   ├── views/                  One module per screen
│   ├── components/             Reusable UI bits
│   ├── compute/                Per-plot, per-project calculations
│   └── export/                 CSV, GeoJSON, PDF generation
├── /data                       Reference data (species lists)
├── /icons                      App icons (PWA)
└── /docs                       Methodology documentation
```

## License

MIT. See `LICENSE`.
