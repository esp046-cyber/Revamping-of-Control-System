# PCS 7 SCADA Execution Guide PWA

Static, dependency-free PWA for GitHub Pages. All project content lives in `data/project.json`.

## Clone for a new project (2 steps)
1. Copy this folder to a new repository and edit `data/project.json`: `projectId`, `title`, `shortTitle`, `client`, `location`, `baseUrl` (your GitHub Pages URL, ends with `/`), plus phases, checklists, runbook, `ioLoops` and `topology`.
2. Run `python3 tools/sync_project.py` (Python 3 standard library only). It updates `index.html` (title, description, Apple title, Open Graph, Twitter), `manifest.webmanifest` (name, short_name, description, id) and bumps the `sw.js` cache version.

Options: `--version 1.5.0` sets the version, `--minor` bumps the minor number, `--no-bump` keeps it, and `--assets` regenerates `assets/og-image.png` and the PNG icons from the project title, short title, client and location (needs `pip install Pillow`; skipped with a message if missing).

Without `--assets` the script does not touch images, so replace `assets/og-image.png` and the icons in `icons/` yourself, then publish from `main` / root (Settings, Pages).

## Notes
- Use a new `projectId` for every project. `localStorage` is shared by every site on the same `github.io` account, and the `projectId` prefix keeps the keys apart.
- The service worker only deletes caches that start with its own `cachePrefix`, so projects on one account do not clear each other's caches.
- The manifest `id` is set to the project's path so two installed projects stay distinct.
- `topology` in `data/project.json` drives the failover simulator (nodes, links, paths, services, faults). A service is lost when every path in it is blocked.
- Engineering values (MRP recovery time, rack-to-bus pairing, acceptance limits, tags) are starter examples. Verify them against the project specification and Siemens documentation.
