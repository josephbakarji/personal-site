// Copy article media (e.g. notebook output folders) from content/articles/
// into public/content/articles/ so /content/articles/... URLs used inside
// the markdown keep resolving. The markdown itself is rendered at build time.
import { cpSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'content/articles';
const DST = 'public/content/articles';
rmSync(DST, { recursive: true, force: true });
for (const name of readdirSync(SRC)) {
  const p = join(SRC, name);
  if (statSync(p).isDirectory() || !name.endsWith('.md')) {
    cpSync(p, join(DST, name), { recursive: true });
  }
}

// Public data files are also served at /data/ for the pages that load them
// in the browser (music player, about-page mind map). Private dashboard
// files never leave the repo.
const PRIVATE = new Set(['ideas.json', 'projects.json']);
rmSync('public/data', { recursive: true, force: true });
for (const name of readdirSync('data')) {
  if (name.endsWith('.json') && !PRIVATE.has(name)) cpSync(join('data', name), join('public/data', name));
}
