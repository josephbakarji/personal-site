#!/usr/bin/env python3
"""
Notebook-to-article pipeline for josephbakarji.com.

Takes a Jupyter notebook (.ipynb, local path or URL), converts it to a
markdown article with images extracted, and drops it into
`content/articles/<slug>.md` alongside a `<slug>_files/` directory for
the images. Optionally executes the notebook first to generate outputs.

Adapted from ~/Documents/01-teaching/ml4science/scripts/convert_notebook.py.

Usage
-----
Local notebook, do not execute (uses existing outputs):
    scripts/notebook_to_article.py path/to/notebook.ipynb my-slug

Notebook from a URL, execute first (generates plots):
    scripts/notebook_to_article.py https://.../nb.ipynb my-slug --execute

Overwrite existing article:
    scripts/notebook_to_article.py path.ipynb my-slug --force

Optional flags:
    --title  "Custom title"        (default: notebook filename)
    --kernel  "python3"             (execute kernel name)
    --timeout  180                  (seconds per cell during execute)
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
import urllib.request
from pathlib import Path

import nbformat


SITE_ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = SITE_ROOT / "content" / "articles"


def load_notebook(path_or_url: str) -> nbformat.NotebookNode:
    if path_or_url.startswith(("http://", "https://")):
        print(f"Fetching {path_or_url}")
        with urllib.request.urlopen(path_or_url) as r:
            data = r.read().decode("utf-8")
        return nbformat.reads(data, as_version=4)
    p = Path(path_or_url).expanduser().resolve()
    if not p.exists():
        sys.exit(f"Notebook not found: {p}")
    with open(p, "r", encoding="utf-8") as f:
        return nbformat.read(f, as_version=4)


def execute_notebook(nb: nbformat.NotebookNode, kernel: str, timeout: int) -> nbformat.NotebookNode:
    from nbclient import NotebookClient
    print(f"Executing notebook (kernel={kernel}, timeout={timeout}s)")
    client = NotebookClient(nb, timeout=timeout, kernel_name=kernel)
    client.execute()
    return nb


def convert_to_markdown(nb: nbformat.NotebookNode, slug: str, images_subdir: Path) -> str:
    """
    Convert a notebook to markdown. Extract images to images_subdir and rewrite
    references to `<slug>_files/<name>`.
    """
    from nbconvert import MarkdownExporter

    exporter = MarkdownExporter()
    md, resources = exporter.from_notebook_node(nb)

    # Save extracted images
    outputs = resources.get("outputs") or {}
    images_subdir.mkdir(parents=True, exist_ok=True)
    for filename, data in outputs.items():
        (images_subdir / filename).write_bytes(data)
    print(f"Extracted {len(outputs)} image(s) to {images_subdir}")

    # Rewrite image paths so they resolve when the article renders in the
    # browser. The viewer at /articles/?slug=<slug> loads the markdown but
    # relative images resolve against the /articles/ URL, not the markdown
    # source path. Absolute paths from the site root are the safe choice.
    md = re.sub(
        r"!\[(.*?)\]\((.*?)\)",
        lambda m: f"![{m.group(1)}](/content/articles/{slug}_files/{Path(m.group(2)).name})",
        md,
    )

    # Normalize LaTeX delimiters for KaTeX. This matches the ml4science
    # script's approach: promote everything to $$...$$ so the site's
    # renderer picks it up consistently.
    md = re.sub(r"\\\[(.*?)\\\]", r"$$\1$$", md, flags=re.DOTALL)
    md = re.sub(r"\\\((.*?)\\\)", r"$$\1$$", md, flags=re.DOTALL)
    md = re.sub(r"\${3}(.*?)\${3}", r"$$\1$$", md, flags=re.DOTALL)

    return md


def add_title(md: str, title: str) -> str:
    """Ensure the markdown starts with a single '# Title' line."""
    if md.lstrip().startswith("# "):
        return md
    return f"# {title}\n\n{md.lstrip()}"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("notebook", help="Local path or https URL to the .ipynb")
    ap.add_argument("slug", help="Article slug (kebab-case)")
    ap.add_argument("--title", default=None, help="Override article title")
    ap.add_argument("--execute", action="store_true", help="Run the notebook before converting")
    ap.add_argument("--kernel", default="python3", help="Kernel name for execute")
    ap.add_argument("--timeout", type=int, default=180, help="Execute cell timeout (s)")
    ap.add_argument("--force", action="store_true", help="Overwrite existing article")
    args = ap.parse_args()

    slug = args.slug.strip()
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", slug):
        sys.exit("Slug must be lowercase kebab-case (a-z, 0-9, hyphens).")

    md_path = ARTICLES_DIR / f"{slug}.md"
    images_dir = ARTICLES_DIR / f"{slug}_files"

    if md_path.exists() and not args.force:
        sys.exit(f"{md_path} exists. Use --force to overwrite.")

    nb = load_notebook(args.notebook)
    if args.execute:
        nb = execute_notebook(nb, args.kernel, args.timeout)

    title = args.title or slug.replace("-", " ").title()
    md = convert_to_markdown(nb, slug, images_dir)
    md = add_title(md, title)

    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md, encoding="utf-8")
    print(f"Wrote {md_path} ({len(md)} chars)")


if __name__ == "__main__":
    main()
