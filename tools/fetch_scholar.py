#!/usr/bin/env python3
"""
Fetch publications from Google Scholar using the scholarly library.
Outputs JSON to data/publications.json for the personal site.

Usage:
    python3 tools/fetch_scholar.py
    python3 tools/fetch_scholar.py --author "Joseph Bakarji"
"""

import json
import sys
import os
from pathlib import Path

SCHOLAR_ID = "1zZNV48AAAAJ"  # Joseph Bakarji's Google Scholar ID

def fetch_publications(author_name="Joseph Bakarji", scholar_id=SCHOLAR_ID):
    from scholarly import scholarly

    if scholar_id:
        print(f"Fetching author by Scholar ID: {scholar_id}")
        author = scholarly.search_author_id(scholar_id)
    else:
        print(f"Searching for author: {author_name}")
        search = scholarly.search_author(author_name)
        author = next(search, None)

    if not author:
        print(f"Author not found on Google Scholar.")
        sys.exit(1)

    print(f"Found: {author.get('name', '?')} — filling details...")
    author = scholarly.fill(author)

    pubs = []
    for i, pub in enumerate(author.get('publications', [])):
        print(f"  [{i+1}] Fetching: {pub['bib'].get('title', '?')[:60]}...")
        try:
            filled = scholarly.fill(pub)
            bib = filled.get('bib', {})

            pub_data = {
                'title': bib.get('title', ''),
                'authors': bib.get('author', ''),
                'year': bib.get('pub_year', ''),
                'venue': bib.get('journal', bib.get('conference', bib.get('venue', ''))),
                'citations': filled.get('num_citations', 0),
                'url': filled.get('pub_url', ''),
                'eprint': bib.get('eprint', ''),
            }
            pubs.append(pub_data)
        except Exception as e:
            print(f"    Warning: failed to fill pub — {e}")
            bib = pub.get('bib', {})
            pubs.append({
                'title': bib.get('title', ''),
                'authors': bib.get('author', ''),
                'year': bib.get('pub_year', ''),
                'venue': '',
                'citations': pub.get('num_citations', 0),
                'url': '',
                'eprint': '',
            })

    # Sort by year descending, then by citations
    pubs.sort(key=lambda p: (-(int(p['year']) if p['year'] else 0), -p['citations']))

    result = {
        'author': {
            'name': author.get('name', author_name),
            'affiliation': author.get('affiliation', ''),
            'scholar_id': author.get('scholar_id', ''),
            'citedby': author.get('citedby', 0),
            'h_index': author.get('hindex', 0),
            'i10_index': author.get('i10index', 0),
        },
        'publications': pubs,
        'fetched': __import__('datetime').datetime.now().isoformat()
    }

    return result


def main():
    author_name = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == '--author' else "Joseph Bakarji"

    data = fetch_publications(author_name)

    out_path = Path(__file__).parent.parent / 'data' / 'publications.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(data['publications'])} publications to {out_path}")
    print(f"Author: {data['author']['name']}")
    print(f"Citations: {data['author']['citedby']}, h-index: {data['author']['h_index']}")


if __name__ == '__main__':
    main()
