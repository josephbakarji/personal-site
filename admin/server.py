#!/usr/bin/env python3
"""
CMS Admin Server for personal site.
Serves admin panel + site preview, provides API for article management.

Usage:
    python3 admin/server.py
    # Admin:  http://localhost:5001/admin/
    # Site:   http://localhost:5001/
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, render_template, send_from_directory, abort

# Paths
SITE_ROOT = Path(__file__).parent.parent.resolve()
DATA_DIR = SITE_ROOT / 'data'
CONTENT_DIR = SITE_ROOT / 'content' / 'articles'
TOOLS_DIR = SITE_ROOT / 'tools'
ARTICLES_JSON = DATA_DIR / 'articles.json'
IDEAS_JSON = DATA_DIR / 'ideas.json'
PROJECTS_JSON = DATA_DIR / 'projects.json'
NEWS_JSON = DATA_DIR / 'news.json'
NEWS_KINDS = ['talk', 'paper', 'writing', 'book', 'demo', 'code']
HERO_JSON = DATA_DIR / 'hero.json'
INDEX_HTML = SITE_ROOT / 'index.html'
HERO_INTRO_PATTERN = re.compile(
    r'(<p class="hero-intro">)(.*?)(</p>)',
    re.DOTALL,
)

# External paths
HOME = Path.home()
PROJECTS_BASE = HOME / 'Documents' / '00-projects'
PROJECTS_ACTIVE = PROJECTS_BASE / '00-active'
PROJECTS_TESTS = PROJECTS_BASE / '01-tests'
PROJECTS_WEBAPPS = PROJECTS_BASE / '04-web-apps'
NEXUS_DIR = HOME / 'Documents' / '05-nexus'
PAPERS_REGISTRY = NEXUS_DIR / 'skills' / 'papers' / 'registry.json'
VOICE_MEMOS_TOOL = NEXUS_DIR / 'tools' / 'voice_memos.py'
TRANSCRIPTS_DIR = HOME / 'Documents' / '00-projects' / '04-web-apps' / 'mirror-app' / 'conversations' / 'transcripts'
CLAUDE_SESSIONS_DIR = HOME / '.claude' / 'projects'

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / 'templates'),
    static_folder=str(Path(__file__).parent / 'static'),
    static_url_path='/admin/static',
)


# --- Helpers ---

def load_articles():
    with open(ARTICLES_JSON) as f:
        return json.load(f)

def save_articles(data):
    with open(ARTICLES_JSON, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def make_slug(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:80]


# --- Helpers: Ideas ---

def load_ideas():
    if not IDEAS_JSON.exists():
        return {'ideas': [], 'stages': [], 'last_updated': None}
    with open(IDEAS_JSON) as f:
        return json.load(f)

def save_ideas(data):
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    with open(IDEAS_JSON, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# --- Helpers: News ---

def load_news():
    if not NEWS_JSON.exists():
        return {'items': [], 'last_updated': None}
    with open(NEWS_JSON) as f:
        return json.load(f)

def save_news(data):
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    with open(NEWS_JSON, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# --- Helpers: Hero intro (landing paragraph) ---

def load_hero():
    if not HERO_JSON.exists():
        return {'intro_html': '', 'last_updated': None}
    with open(HERO_JSON) as f:
        return json.load(f)

def save_hero(data):
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    with open(HERO_JSON, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def sync_intro_to_index(intro_html):
    """
    Patch the <p class="hero-intro">...</p> body in index.html so the
    landing renders the same intro that admin/hero shows. Preserves
    surrounding whitespace/indentation. Non-destructive if pattern
    doesn't match (raises so the caller can surface the error).
    """
    txt = INDEX_HTML.read_text(encoding='utf-8')
    def repl(m):
        return f"{m.group(1)}\n        {intro_html.strip()}\n      {m.group(3)}"
    new_txt, n = HERO_INTRO_PATTERN.subn(repl, txt, count=1)
    if n == 0:
        raise ValueError('could not locate <p class="hero-intro"> in index.html')
    INDEX_HTML.write_text(new_txt, encoding='utf-8')


# --- Helpers: Projects metadata ---

def load_projects_meta():
    if not PROJECTS_JSON.exists():
        return {'projects': {}, 'collaborators': [], 'last_updated': None}
    with open(PROJECTS_JSON) as f:
        return json.load(f)

def save_projects_meta(data):
    data['last_updated'] = datetime.now().strftime('%Y-%m-%d')
    with open(PROJECTS_JSON, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

_PROJECT_META_DEFAULTS = {
    'priority': None,
    'deadline': None,
    'collaborators': [],
    'status': 'active',
    'notes': '',
}


# --- Admin UI ---

@app.route('/admin/')
def admin_page():
    return render_template('admin.html')

@app.route('/admin/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/admin/projects')
def projects_page():
    return render_template('projects.html')

@app.route('/admin/news')
def news_page():
    return render_template('news.html')

@app.route('/admin/hero')
def hero_page():
    return render_template('hero.html')

@app.route('/admin/sessions')
def sessions_page():
    return render_template('sessions.html')


# --- API: Articles ---

@app.route('/api/articles', methods=['GET'])
def get_articles():
    return jsonify(load_articles())

@app.route('/api/articles', methods=['POST'])
def create_article():
    body = request.json
    title = body.get('title', 'Untitled')
    slug = body.get('slug') or make_slug(title)

    data = load_articles()

    # Check for duplicate slug
    if any(a['slug'] == slug for a in data['articles']):
        return jsonify({'error': f'Article with slug "{slug}" already exists'}), 409

    article = {
        'slug': slug,
        'title': title,
        'date': body.get('date', ''),
        'tags': body.get('tags', []),
        'excerpt': body.get('excerpt', ''),
        'has_math': body.get('has_math', False),
        'source': 'local',
        'published': body.get('published', True),
    }

    data['articles'].insert(0, article)
    save_articles(data)

    # Create blank markdown file
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = CONTENT_DIR / f'{slug}.md'
    if not md_path.exists():
        md_path.write_text(f'# {title}\n\n')

    return jsonify(article), 201

@app.route('/api/articles/<slug>', methods=['PUT'])
def update_article(slug):
    data = load_articles()
    article = next((a for a in data['articles'] if a['slug'] == slug), None)
    if not article:
        return jsonify({'error': 'Article not found'}), 404

    body = request.json
    for key in ['title', 'date', 'tags', 'excerpt', 'has_math', 'published', 'external_url']:
        if key in body:
            article[key] = body[key]

    # Handle slug rename
    new_slug = body.get('slug')
    if new_slug and new_slug != slug:
        if any(a['slug'] == new_slug for a in data['articles'] if a is not article):
            return jsonify({'error': f'Slug "{new_slug}" already exists'}), 409
        # Rename markdown file if local
        if article.get('source') == 'local':
            old_path = CONTENT_DIR / f'{slug}.md'
            new_path = CONTENT_DIR / f'{new_slug}.md'
            if old_path.exists():
                old_path.rename(new_path)
        article['slug'] = new_slug

    save_articles(data)
    return jsonify(article)

@app.route('/api/articles/<slug>', methods=['DELETE'])
def delete_article(slug):
    data = load_articles()
    article = next((a for a in data['articles'] if a['slug'] == slug), None)
    if not article:
        return jsonify({'error': 'Article not found'}), 404

    data['articles'] = [a for a in data['articles'] if a['slug'] != slug]
    save_articles(data)

    # Optionally delete markdown file
    if request.args.get('delete_file') == 'true' and article.get('source') == 'local':
        md_path = CONTENT_DIR / f'{slug}.md'
        if md_path.exists():
            md_path.unlink()

    return jsonify({'deleted': slug})

@app.route('/api/articles/<slug>/content', methods=['GET'])
def get_content(slug):
    md_path = CONTENT_DIR / f'{slug}.md'
    if not md_path.exists():
        return jsonify({'error': 'Content not found'}), 404
    return jsonify({'slug': slug, 'content': md_path.read_text()})

@app.route('/api/articles/<slug>/content', methods=['PUT'])
def save_content(slug):
    body = request.json
    content = body.get('content', '')

    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = CONTENT_DIR / f'{slug}.md'
    md_path.write_text(content)

    return jsonify({'slug': slug, 'saved': True})

@app.route('/api/articles/reorder', methods=['POST'])
def reorder_articles():
    body = request.json
    slugs = body.get('slugs', [])

    data = load_articles()
    article_map = {a['slug']: a for a in data['articles']}

    reordered = []
    for slug in slugs:
        if slug in article_map:
            reordered.append(article_map.pop(slug))
    # Append any remaining articles not in the reorder list
    reordered.extend(article_map.values())

    data['articles'] = reordered
    save_articles(data)
    return jsonify({'reordered': len(reordered)})


# --- API: Dashboard ---

# --- Hero API ---

@app.route('/api/hero', methods=['GET'])
def api_get_hero():
    return jsonify(load_hero())

@app.route('/api/hero', methods=['PUT'])
def api_update_hero():
    body = request.json or {}
    intro_html = (body.get('intro_html') or '').strip()
    if not intro_html:
        return jsonify({'error': 'intro_html is required'}), 400
    data = load_hero()
    data['intro_html'] = intro_html
    save_hero(data)
    try:
        sync_intro_to_index(intro_html)
    except Exception as e:
        return jsonify({
            'error': f'saved hero.json but failed to update index.html: {e}',
            'data': data,
        }), 500
    return jsonify(data)


# --- News API ---

@app.route('/api/news', methods=['GET'])
def api_get_news():
    return jsonify(load_news())

@app.route('/api/news', methods=['POST'])
def api_create_news():
    body = request.json or {}
    data = load_news()
    item = {
        'id': body.get('id') or datetime.now().strftime('%Y%m%d%H%M%S%f'),
        'date': body.get('date') or datetime.now().strftime('%Y-%m-%d'),
        'kind': body.get('kind', 'writing'),
        'headline': body.get('headline', ''),
        'link': body.get('link') or None,
        'note': body.get('note') or None,
    }
    if item['kind'] not in NEWS_KINDS:
        return jsonify({'error': f'kind must be one of {NEWS_KINDS}'}), 400
    if not item['headline'].strip():
        return jsonify({'error': 'headline is required'}), 400
    data.setdefault('items', []).insert(0, item)
    save_news(data)
    return jsonify(item), 201

@app.route('/api/news/<item_id>', methods=['PUT'])
def api_update_news(item_id):
    body = request.json or {}
    data = load_news()
    for it in data.get('items', []):
        if it.get('id') == item_id:
            for k in ('date', 'kind', 'headline', 'link', 'note'):
                if k in body:
                    it[k] = body[k] if body[k] != '' else None
            if it.get('kind') not in NEWS_KINDS:
                return jsonify({'error': f'kind must be one of {NEWS_KINDS}'}), 400
            save_news(data)
            return jsonify(it)
    return jsonify({'error': 'not found'}), 404

@app.route('/api/news/<item_id>', methods=['DELETE'])
def api_delete_news(item_id):
    data = load_news()
    n_before = len(data.get('items', []))
    data['items'] = [i for i in data.get('items', []) if i.get('id') != item_id]
    if len(data['items']) == n_before:
        return jsonify({'error': 'not found'}), 404
    save_news(data)
    return jsonify({'ok': True})


@app.route('/api/dashboard/ideas', methods=['GET'])
def get_ideas():
    return jsonify(load_ideas())

@app.route('/api/dashboard/ideas', methods=['POST'])
def create_idea():
    body = request.json
    data = load_ideas()
    idea_id = body.get('id') or make_slug(body.get('title', 'untitled'))
    if any(i['id'] == idea_id for i in data['ideas']):
        return jsonify({'error': f'Idea "{idea_id}" already exists'}), 409
    idea = {
        'id': idea_id,
        'title': body.get('title', 'Untitled'),
        'date': body.get('date', datetime.now().strftime('%Y-%m-%d')),
        'origin': body.get('origin', ''),
        'status': body.get('status', 'active'),
        'stage': body.get('stage', 'raw'),
        'linked_project': body.get('linked_project'),
        'linked_article': body.get('linked_article'),
        'linked_paper': body.get('linked_paper'),
        'tags': body.get('tags', []),
        'notes': body.get('notes', ''),
        'sessions': body.get('sessions', []),
    }
    data['ideas'].insert(0, idea)
    save_ideas(data)
    return jsonify(idea), 201

@app.route('/api/dashboard/ideas/<idea_id>', methods=['PUT'])
def update_idea(idea_id):
    data = load_ideas()
    idea = next((i for i in data['ideas'] if i['id'] == idea_id), None)
    if not idea:
        return jsonify({'error': 'Idea not found'}), 404
    body = request.json
    for key in ['title', 'date', 'origin', 'status', 'stage', 'linked_project',
                'linked_article', 'linked_paper', 'tags', 'notes', 'sessions']:
        if key in body:
            idea[key] = body[key]
    save_ideas(data)
    return jsonify(idea)

@app.route('/api/dashboard/ideas/<idea_id>', methods=['DELETE'])
def delete_idea(idea_id):
    data = load_ideas()
    data['ideas'] = [i for i in data['ideas'] if i['id'] != idea_id]
    save_ideas(data)
    return jsonify({'deleted': idea_id})

@app.route('/api/dashboard/projects', methods=['GET'])
def get_projects():
    projects = []
    # 00-active: cluster/project structure (e.g. scientificml/lenia-sindy)
    if PROJECTS_ACTIVE.exists():
        for cluster in sorted(PROJECTS_ACTIVE.iterdir()):
            if not cluster.is_dir() or cluster.name.startswith('.'):
                continue
            for p in sorted(cluster.iterdir()):
                if not p.is_dir() or p.name.startswith('.'):
                    continue
                projects.append(_make_project_entry(p, cluster.name, 'active'))
    # 04-web-apps: direct children
    if PROJECTS_WEBAPPS.exists():
        for p in sorted(PROJECTS_WEBAPPS.iterdir()):
            if not p.is_dir() or p.name.startswith('.'):
                continue
            projects.append(_make_project_entry(p, 'web-apps', 'webapp'))
    # Merge persistent metadata
    meta = load_projects_meta()
    proj_meta = meta.get('projects', {})
    for p in projects:
        pm = proj_meta.get(p['relative'], {})
        for key, default in _PROJECT_META_DEFAULTS.items():
            p[key] = pm.get(key, default)
    # Filter
    status_filter = request.args.get('status')
    if status_filter:
        projects = [p for p in projects if p.get('status') == status_filter]
    # Sort
    sort_by = request.args.get('sort', 'priority')
    if sort_by == 'priority':
        projects.sort(key=lambda x: (-(x.get('priority') or 0), x.get('modified', '') or ''))
    elif sort_by == 'deadline':
        projects.sort(key=lambda x: (x.get('deadline') or '9999-99-99'))
    else:
        projects.sort(key=lambda x: x.get('modified', ''), reverse=True)
    return jsonify({'projects': projects})


@app.route('/api/dashboard/projects/<path:relative>', methods=['PUT'])
def update_project(relative):
    meta = load_projects_meta()
    body = request.json
    entry = meta['projects'].get(relative, dict(_PROJECT_META_DEFAULTS))
    for key in ['priority', 'deadline', 'collaborators', 'status', 'notes']:
        if key in body:
            entry[key] = body[key]
    meta['projects'][relative] = entry
    # Auto-add new collaborators to the global list
    for c in entry.get('collaborators', []):
        if c and c not in meta.get('collaborators', []):
            meta.setdefault('collaborators', []).append(c)
    save_projects_meta(meta)
    return jsonify(entry)


@app.route('/api/dashboard/collaborators', methods=['GET'])
def get_collaborators():
    meta = load_projects_meta()
    return jsonify({'collaborators': meta.get('collaborators', [])})


@app.route('/api/dashboard/collaborators', methods=['POST'])
def add_collaborator():
    body = request.json
    name = body.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    meta = load_projects_meta()
    if name not in meta.get('collaborators', []):
        meta.setdefault('collaborators', []).append(name)
        save_projects_meta(meta)
    return jsonify({'collaborators': meta['collaborators']})

_SKIP_DIRS = {'.git', '.venv', 'venv', 'node_modules', '__pycache__', '.tox',
              'build', 'dist', '.eggs', 'wandb', '.mypy_cache', '.pytest_cache',
              'env', '.env', '.ipynb_checkpoints', '.cache'}

def _project_mtime(p):
    """Get last-modified date for a project dir. Fast: tries git first, then shallow scan."""
    git_dir = p / '.git'
    if git_dir.exists():
        try:
            result = subprocess.run(
                ['git', 'log', '-1', '--format=%ci'],
                capture_output=True, text=True, timeout=3, cwd=str(p)
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()[:10]  # YYYY-MM-DD
        except Exception:
            pass
    # Fallback: shallow scan (top-level files + one level of non-skipped subdirs)
    best = 0
    try:
        for f in p.iterdir():
            if f.name.startswith('.'):
                continue
            if f.is_file():
                best = max(best, f.stat().st_mtime)
            elif f.is_dir() and f.name not in _SKIP_DIRS:
                for ff in f.iterdir():
                    if ff.is_file() and not ff.name.startswith('.'):
                        best = max(best, ff.stat().st_mtime)
    except OSError:
        pass
    return datetime.fromtimestamp(best).strftime('%Y-%m-%d') if best else ''

def _make_project_entry(p, cluster, base_type):
    """Create a project entry dict from a directory path."""
    has_paper = (p / 'paper').is_dir()
    has_claude = (p / 'CLAUDE.md').exists()
    modified = _project_mtime(p)
    # Read first line of CLAUDE.md as description
    description = ''
    if has_claude:
        try:
            text = (p / 'CLAUDE.md').read_text(errors='ignore')
            for line in text.split('\n'):
                line = line.strip()
                if line and not line.startswith('#'):
                    description = line[:200]
                    break
        except Exception:
            pass
    return {
        'name': p.name,
        'path': str(p),
        'relative': f'{cluster}/{p.name}',
        'cluster': cluster,
        'modified': modified,
        'has_paper': has_paper,
        'has_claude': has_claude,
        'description': description,
        'base': base_type,
    }

@app.route('/api/dashboard/papers', methods=['GET'])
def get_papers():
    if not PAPERS_REGISTRY.exists():
        return jsonify({'items': []})
    with open(PAPERS_REGISTRY) as f:
        return jsonify(json.load(f))

@app.route('/api/dashboard/voice-memos', methods=['GET'])
def get_voice_memos():
    if not VOICE_MEMOS_TOOL.exists():
        return jsonify({'error': 'voice_memos.py not found'}), 404
    count = request.args.get('count', '10')
    result = subprocess.run(
        [sys.executable, str(VOICE_MEMOS_TOOL), 'recent', count],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode != 0:
        return jsonify({'error': result.stderr, 'memos': []})
    memos = []
    for line in result.stdout.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('─') or line.startswith('[T]='):
            continue
        # Parse: [T] 2026-02-23 10:11   49.0m  3691383D  title here
        m = re.match(
            r'\[([T ])\]\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([\d.]+)m\s+([A-F0-9]+)\s+(.*)',
            line
        )
        if m:
            memos.append({
                'transcribed': m.group(1) == 'T',
                'date': m.group(2),
                'time': m.group(3),
                'duration_min': float(m.group(4)),
                'id': m.group(5),
                'title': m.group(6).strip(),
            })
    return jsonify({'memos': memos})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_stats():
    articles = load_articles().get('articles', [])
    ideas_data = load_ideas()
    ideas = ideas_data.get('ideas', [])
    stages = {}
    for idea in ideas:
        s = idea.get('stage', 'raw')
        stages[s] = stages.get(s, 0) + 1
    return jsonify({
        'articles': len(articles),
        'articles_local': sum(1 for a in articles if a.get('source') == 'local'),
        'ideas': len(ideas),
        'ideas_by_stage': stages,
        'papers': 0,  # filled below
    })


def _decode_claude_project_dir(dirname):
    """Decode a Claude project directory name back to a readable path.
    e.g. '-Users-josephbakarji-Documents-05-nexus' -> '~/Documents/05-nexus'
    Uses greedy filesystem matching to resolve ambiguous hyphens."""
    parts = dirname.lstrip('-').split('-')
    # Greedily reconstruct the path by checking filesystem
    result = '/'
    i = 0
    while i < len(parts):
        # Try joining segments until we find a valid path component
        best = None
        for j in range(len(parts), i, -1):
            candidate = '-'.join(parts[i:j])
            test_path = os.path.join(result, candidate)
            if os.path.exists(test_path):
                best = (candidate, j)
                break
        if best:
            result = os.path.join(result, best[0])
            i = best[1]
        else:
            result = os.path.join(result, parts[i])
            i += 1
    # Shorten home prefix
    home_str = str(HOME)
    if result.startswith(home_str):
        result = '~' + result[len(home_str):]
    return result


def _extract_text(msg):
    """Extract text content from a Claude JSONL message field."""
    if isinstance(msg, str):
        import ast
        try:
            msg = ast.literal_eval(msg)
        except Exception:
            return msg[:200]
    if isinstance(msg, dict):
        content = msg.get('content', '')
    else:
        return str(msg)[:200]
    if isinstance(content, list):
        texts = []
        for c in content:
            if isinstance(c, dict) and c.get('type') == 'text':
                texts.append(c['text'])
        return ' '.join(texts)
    return str(content)


def _extract_session_info(filepath):
    """Extract topic info from a Claude JSONL session file.
    Returns (user_messages, summary) where user_messages is a list of the first
    few real user messages and summary is the compact summary if present."""
    user_msgs = []
    summary = ''
    try:
        with open(filepath) as f:
            for line in f:
                obj = json.loads(line)
                # Check for compact summary (auto-generated session synopsis)
                if obj.get('type') == 'user' and obj.get('isCompactSummary'):
                    text = _extract_text(obj.get('message', {}))
                    if text:
                        summary = text[:500].replace('\n', ' ').strip()
                    continue
                # Real user messages (not tool results)
                if obj.get('type') == 'user' and not obj.get('toolUseResult'):
                    text = _extract_text(obj.get('message', {}))
                    text = text.replace('\n', ' ').strip()
                    # Skip system-reminder-only messages
                    if text and not text.startswith('<system-reminder>'):
                        user_msgs.append(text[:200])
                        if len(user_msgs) >= 5:
                            break
    except Exception:
        pass
    return user_msgs, summary


@app.route('/api/dashboard/sessions', methods=['GET'])
def get_sessions():
    """Scan Claude Code JSONL session files, extract ID, date, and topic context."""
    claude_dir = HOME / '.claude' / 'projects'
    if not claude_dir.exists():
        return jsonify({'sessions': []})
    sessions = []
    for proj_dir in sorted(claude_dir.iterdir()):
        if not proj_dir.is_dir():
            continue
        readable = _decode_claude_project_dir(proj_dir.name)
        for jf in sorted(proj_dir.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True):
            sid = jf.stem
            stat = jf.stat()
            mtime = datetime.fromtimestamp(stat.st_mtime)
            size_mb = stat.st_size / (1024 * 1024)
            user_msgs, summary = _extract_session_info(jf)
            sessions.append({
                'id': sid,
                'project_dir': readable,
                'date': mtime.strftime('%Y-%m-%d'),
                'time': mtime.strftime('%H:%M'),
                'size_mb': round(size_mb, 1),
                'topic': user_msgs[0] if user_msgs else '(no topic)',
                'messages': user_msgs[:5],
                'summary': summary,
            })
    sessions.sort(key=lambda s: (s['date'], s['time']), reverse=True)
    limit = int(request.args.get('limit', '30'))
    return jsonify({'sessions': sessions[:limit]})


@app.route('/api/dashboard/search', methods=['GET'])
def dashboard_search():
    """Keyword search across voice memos, sessions, and projects."""
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return jsonify({'error': 'Query too short', 'results': []}), 400
    limit = int(request.args.get('limit', '30'))
    results = []
    q_lower = q.lower()

    # 1. Voice memo transcripts
    if TRANSCRIPTS_DIR.exists():
        for tf in TRANSCRIPTS_DIR.iterdir():
            if not tf.name.endswith('.json'):
                continue
            try:
                with open(tf) as f:
                    data = json.load(f)
                text = data.get('text', '')
                if not text:
                    continue
                idx = text.lower().find(q_lower)
                if idx == -1:
                    continue
                # Extract snippet with context
                start = max(0, idx - 80)
                end = min(len(text), idx + len(q) + 120)
                snippet = ('...' if start > 0 else '') + text[start:end] + ('...' if end < len(text) else '')
                # Parse date from filename: "YYYYMMDD HHMMSS-ID.json"
                fname = tf.stem
                date_str = fname[:8]
                memo_id = fname.split('-')[-1] if '-' in fname else ''
                try:
                    date_fmt = f'{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}'
                except Exception:
                    date_fmt = ''
                duration = data.get('duration', 0)
                results.append({
                    'type': 'memo',
                    'title': f'Voice memo {memo_id}',
                    'date': date_fmt,
                    'snippet': snippet,
                    'id': memo_id,
                    'duration_min': round(duration / 60, 1) if duration else 0,
                })
            except Exception:
                continue

    # 2. Claude sessions
    if CLAUDE_SESSIONS_DIR.exists():
        for proj_dir in CLAUDE_SESSIONS_DIR.iterdir():
            if not proj_dir.is_dir():
                continue
            project_path = _decode_claude_project_dir(proj_dir.name)
            for jf in proj_dir.glob('*.jsonl'):
                try:
                    sid = jf.stem
                    mtime = datetime.fromtimestamp(jf.stat().st_mtime)
                    found_snippets = []
                    first_topic = ''
                    with open(jf) as f:
                        for line in f:
                            obj = json.loads(line)
                            if obj.get('type') not in ('user', 'assistant'):
                                continue
                            if obj.get('type') == 'user' and obj.get('toolUseResult'):
                                continue
                            text = _extract_text(obj.get('message', {}))
                            if not text:
                                continue
                            # Grab first user message as topic
                            if not first_topic and obj.get('type') == 'user':
                                first_topic = text[:120].replace('\n', ' ').strip()
                            idx = text.lower().find(q_lower)
                            if idx != -1:
                                start = max(0, idx - 80)
                                end = min(len(text), idx + len(q) + 120)
                                snip = ('...' if start > 0 else '') + text[start:end].replace('\n', ' ') + ('...' if end < len(text) else '')
                                found_snippets.append(snip)
                                if len(found_snippets) >= 3:
                                    break
                    if found_snippets:
                        results.append({
                            'type': 'session',
                            'title': first_topic or '(no topic)',
                            'date': mtime.strftime('%Y-%m-%d'),
                            'snippet': found_snippets[0],
                            'extra_snippets': found_snippets[1:],
                            'id': sid,
                            'project_dir': project_path,
                        })
                except Exception:
                    continue

    # 3. Projects — search key files (README, CLAUDE.md, .tex, top-level .py)
    _PROJECT_FILES = {'README.md', 'CLAUDE.md'}
    _PROJECT_EXTENSIONS = {'.py', '.tex', '.md', '.js'}
    for base in [PROJECTS_ACTIVE, PROJECTS_WEBAPPS]:
        if not base.exists():
            continue
        for root, dirs, files in os.walk(str(base)):
            # Skip heavy directories
            dirs[:] = [d for d in dirs if d not in _SKIP_DIRS and not d.startswith('.')]
            root_path = Path(root)
            depth = len(root_path.relative_to(base).parts)
            if depth > 3:
                dirs.clear()
                continue
            for fname in files:
                if fname in _PROJECT_FILES or (Path(fname).suffix in _PROJECT_EXTENSIONS and depth <= 2):
                    fpath = root_path / fname
                    try:
                        if fpath.stat().st_size > 500_000:  # skip large files
                            continue
                        text = fpath.read_text(errors='ignore')
                        idx = text.lower().find(q_lower)
                        if idx == -1:
                            continue
                        start = max(0, idx - 80)
                        end = min(len(text), idx + len(q) + 120)
                        snippet = ('...' if start > 0 else '') + text[start:end].replace('\n', ' ') + ('...' if end < len(text) else '')
                        # Find project name
                        try:
                            rel = str(fpath.relative_to(base))
                        except ValueError:
                            rel = str(fpath)
                        proj_name = rel.split(os.sep)[0] if os.sep in rel else rel
                        results.append({
                            'type': 'project',
                            'title': f'{proj_name} / {fname}',
                            'date': datetime.fromtimestamp(fpath.stat().st_mtime).strftime('%Y-%m-%d'),
                            'snippet': snippet,
                            'path': str(fpath),
                        })
                    except Exception:
                        continue

    # Sort by date descending
    results.sort(key=lambda r: r.get('date', ''), reverse=True)
    return jsonify({'query': q, 'count': len(results), 'results': results[:limit]})


@app.route('/admin/workflow')
def workflow_page():
    return render_template('workflow.html')


# --- API: Sync ---

@app.route('/api/sync/substack', methods=['POST'])
def sync_substack():
    script = TOOLS_DIR / 'fetch_substack.py'
    if not script.exists():
        return jsonify({'error': 'fetch_substack.py not found'}), 404
    result = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True, text=True, cwd=str(SITE_ROOT)
    )
    return jsonify({
        'success': result.returncode == 0,
        'output': result.stdout,
        'error': result.stderr,
    })

@app.route('/api/sync/scholar', methods=['POST'])
def sync_scholar():
    script = TOOLS_DIR / 'fetch_scholar.py'
    if not script.exists():
        return jsonify({'error': 'fetch_scholar.py not found'}), 404
    result = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True, text=True, cwd=str(SITE_ROOT)
    )
    return jsonify({
        'success': result.returncode == 0,
        'output': result.stdout,
        'error': result.stderr,
    })


# --- Serve static site files ---

@app.route('/')
def serve_index():
    return send_from_directory(str(SITE_ROOT), 'index.html')

@app.route('/<path:filepath>')
def serve_site(filepath):
    # Serve folder/index.html for directory-style URLs
    full_path = SITE_ROOT / filepath
    if full_path.is_dir():
        index = full_path / 'index.html'
        if index.exists():
            return send_from_directory(str(full_path), 'index.html')
    if full_path.exists():
        return send_from_directory(str(full_path.parent), full_path.name)
    abort(404)


# --- Main ---

if __name__ == '__main__':
    print(f'Site root:  {SITE_ROOT}')
    print(f'Dashboard:  http://localhost:5001/admin/dashboard')
    print(f'Articles:   http://localhost:5001/admin/')
    print(f'Site:       http://localhost:5001/')
    app.run(port=5001, debug=False)
