# TODO — personal site

Rolling list of things to fix / write / rework.

## Broken / needs a fix

- **SemAtlas custom domain (sematlas.com)** — site links now point at the working Render URL `https://sematlas.onrender.com`. Bring back the custom domain when ready:
  - Render dashboard → SemAtlas service → Settings → Custom Domains → add `sematlas.com` and `www.sematlas.com`. Render will give a CNAME target (something like `sematlas-xxxx.onrender.com`).
  - DreamHost DNS: add `CNAME www → <render target>`; for apex `sematlas.com` use an ALIAS/ANAME record (DreamHost supports ANAME) pointing at the same target, or A records to Render's advertised IPs. TTL 300 while testing.
  - The "two custom domains per plan" recollection is likely from Render's older free tier — the paid Starter plan and above allow many custom domains per service. Check the Render pricing page for the current limit before assuming.
  - Once the custom domain resolves + SSL is issued (Render provisions Let's Encrypt automatically), swap the site links back from `sematlas.onrender.com` → `sematlas.com`.
- **Rope-flow physics simulator** at `assets/music/sim/ropeflow.html` breaks on load in the current music-page iframe context. Debug + drop it into a dedicated article when we write the sim writeup.
- **Music page mobile layout** — video / Piano-of-Life panel don't render usably on small screens; noted in the page's under-construction banner.

## To write

- **Article: Rope Flow Music.** Bring together the NeurIPS Creative-AI submission (currently linked as PDF from the Rope Flow Music project card) into a proper standalone piece with the physics sim embedded and the videos linked.
- **Article: Piano of Life** already exists (`content/articles/piano-of-life.md`); consider a "Piano of Life II" once the vertical/rotated version is stable and we're comfortable pushing more of my pieces.

## Content sync backlog

- **Publications**: `python3 tools/fetch_scholar.py` — re-run periodically. Author names shortened to initials in a post-process.
- **Substack posts**: `python3 tools/fetch_substack.py` — re-run to refresh the articles list + landing "recent writing" strip.

## Nice-to-haves

- **VIPP student list** on the team page.
- **Team member photos** once we have consented ones.
- Second-pass review of collaborators on each `data/portfolio.json` card — some are still stale.
