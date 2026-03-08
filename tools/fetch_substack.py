#!/usr/bin/env python3
"""
Fetch posts from Substack RSS feed.
Outputs JSON to data/substack_posts.json for the personal site.

Usage:
    python3 tools/fetch_substack.py
    python3 tools/fetch_substack.py --url https://bakarji.substack.com/feed
"""

import json
import sys
import re
from pathlib import Path
from datetime import datetime

FEED_URL = "https://bakarji.substack.com/feed"

def strip_html(html):
    """Remove HTML tags, decode entities, return plain text."""
    text = re.sub(r'<[^>]+>', '', html)
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    return re.sub(r'\s+', ' ', text).strip()

def make_slug(title):
    """Convert title to URL-friendly slug."""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:80]

def extract_excerpt(content, max_len=200):
    """Extract first meaningful paragraph as excerpt."""
    text = strip_html(content)
    if len(text) > max_len:
        text = text[:max_len].rsplit(' ', 1)[0] + '...'
    return text

def fetch_posts(feed_url=FEED_URL):
    import feedparser

    print(f"Fetching RSS feed: {feed_url}")
    feed = feedparser.parse(feed_url)

    if feed.bozo and not feed.entries:
        print(f"Error parsing feed: {feed.bozo_exception}")
        sys.exit(1)

    channel = {
        'title': feed.feed.get('title', ''),
        'description': feed.feed.get('description', ''),
        'link': feed.feed.get('link', ''),
    }

    posts = []
    for entry in feed.entries:
        # Parse date
        published = entry.get('published_parsed') or entry.get('updated_parsed')
        if published:
            date_str = datetime(*published[:6]).strftime('%Y-%m-%d')
        else:
            date_str = ''

        # Extract tags/categories
        tags = [t.get('term', '') for t in entry.get('tags', [])]
        tags = [t for t in tags if t]

        # Get content
        content = ''
        if entry.get('content'):
            content = entry.content[0].get('value', '')
        elif entry.get('summary'):
            content = entry.summary

        post = {
            'title': entry.get('title', ''),
            'slug': make_slug(entry.get('title', '')),
            'date': date_str,
            'url': entry.get('link', ''),
            'excerpt': extract_excerpt(content),
            'tags': tags,
            'has_math': False,
            'source': 'substack',
        }
        posts.append(post)
        print(f"  [{len(posts)}] {post['title'][:60]}")

    # Sort by date descending
    posts.sort(key=lambda p: p['date'], reverse=True)

    return {
        'channel': channel,
        'posts': posts,
        'fetched': datetime.now().isoformat(),
    }


def update_articles_json(substack_data, articles_path):
    """Merge Substack posts into articles.json, preserving local articles."""
    # Load existing articles
    if articles_path.exists():
        with open(articles_path) as f:
            data = json.load(f)
    else:
        data = {'articles': []}

    # Build map of existing articles to preserve 'published' status
    existing = {a['slug']: a for a in data['articles']}

    # Remove old Substack entries
    local_articles = [a for a in data['articles'] if a.get('source') != 'substack']

    # Convert Substack posts to article format
    substack_articles = []
    for post in substack_data['posts']:
        # Carry over 'published' from existing entry if it was set
        prev = existing.get(post['slug'], {})
        published = prev.get('published', True)

        substack_articles.append({
            'slug': post['slug'],
            'title': post['title'],
            'date': post['date'],
            'tags': post['tags'] if post['tags'] else ['essay'],
            'excerpt': post['excerpt'],
            'has_math': post['has_math'],
            'source': 'substack',
            'external_url': post['url'],
            'published': published,
        })

    # Merge: local articles + substack articles
    all_articles = local_articles + substack_articles
    all_articles.sort(key=lambda a: a['date'], reverse=True)

    data['articles'] = all_articles
    return data


def main():
    feed_url = FEED_URL
    if len(sys.argv) > 2 and sys.argv[1] == '--url':
        feed_url = sys.argv[2]

    substack_data = fetch_posts(feed_url)

    # Save raw Substack data
    out_path = Path(__file__).parent.parent / 'data' / 'substack_posts.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, 'w') as f:
        json.dump(substack_data, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(substack_data['posts'])} Substack posts to {out_path}")

    # Also update articles.json with merged data
    articles_path = Path(__file__).parent.parent / 'data' / 'articles.json'
    merged = update_articles_json(substack_data, articles_path)

    with open(articles_path, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    local_count = len([a for a in merged['articles'] if a.get('source') != 'substack'])
    substack_count = len([a for a in merged['articles'] if a.get('source') == 'substack'])
    print(f"Updated articles.json: {local_count} local + {substack_count} Substack = {len(merged['articles'])} total")


if __name__ == '__main__':
    main()
