#!/usr/bin/env python3
"""Check built public pages for retired donations and advertising disclosures."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ['company','timer','clock','stopwatch','breathe','relax','calculator','lava','metronome','sound']
count = 0
for project in PROJECTS:
    dist = ROOT / project / 'dist'
    assert dist.is_dir(), f'Build {project} first'
    for page in dist.rglob('*.html'):
        html = page.read_text()
        assert not re.search(r'buy\s*me\s*a\s*coffee|buymeacoffee', html, re.I), page
        count += 1
    privacy_paths = ['datenschutz/index.html'] if project == 'company' else ['de/privacy/index.html','en/privacy/index.html']
    for path in privacy_paths:
        page = dist / path
        html = page.read_text()
        for required in ['Google AdSense','Google Ireland Limited','myadcenter.google.com','policies.google.com/privacy']:
            assert required in html, (page,required)
        assert not re.search(r'Wir binden keine Werbeskripte|We do not embed advertising scripts',html),page
print(f'{count} built HTML pages: retired donations absent; privacy disclosures present in all 10 projects.')
