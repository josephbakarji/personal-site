import { defineConfig } from 'astro/config';

// Static output for GitHub Pages. Content lives outside src/ on purpose:
// data/*.json and content/articles/*.md are edited by the admin dashboard
// and the tools/ scripts, and read here at build time.
export default defineConfig({
  site: 'https://www.josephbakarji.com',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
