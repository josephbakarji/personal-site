# Personal Site

Personal website and admin dashboard for showcasing research, writing, and managing ideas and projects.

## Structure (Astro, static output)

- `src/pages/*.astro` are the pages; `src/layouts/Base.astro` holds the head, nav, and footer for all of them.
- `data/*.json` and `content/articles/*.md` are the content. They are read at build time, so lists render into the HTML (no loading flash). The admin dashboard and `tools/` scripts write here.
- `public/` is copied as-is: `public/assets/`, `public/css/`, `public/js/`. Interactive pieces (Piano of Life player, mind map, videos filter) are plain scripts in `public/js/`.
- `scripts/sync-content.mjs` runs before every build: copies article media to `public/content/` and public JSON to `public/data/` (both gitignored).
- Articles live at `/articles/<slug>/`. Old `/articles/?slug=x` links redirect. `published: false` means no page is built; `listed: false` builds the page but hides it from lists.
- Local preview: `npm run dev`. Admin dashboard: `npm run build`, then `python admin/server.py` (serves `dist/`).
- Deploy: push to `main`; `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.
- Site copy rules: no em-dashes, no arrows.
