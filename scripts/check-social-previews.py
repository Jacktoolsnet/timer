#!/usr/bin/env python3
"""Build all nine projects first, then verify social metadata and local PNG assets."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ['company','timer','clock','stopwatch','calculator','breathe','relax','lava','scenescript']
class Metadata(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.values = {}
        self.language = ''
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.language = a.get('lang', '')
        if tag == 'meta':
            key = a.get('property') or a.get('name')
            if key: self.values.setdefault(key, []).append(a.get('content', ''))
    def one(self, key):
        values = self.values.get(key, [])
        assert len(values) == 1 and values[0], (key, values)
        return values[0]

pages = 0
for project in PROJECTS:
    dist = ROOT / project / 'dist'
    host = 'jacktools.net' if project == 'company' else project + '.jacktools.net'
    image_url = f'https://{host}/social/{project}.png'
    image = dist / 'social' / f'{project}.png'
    data = image.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', image
    assert struct.unpack('>II', data[16:24]) == (1200,630), image
    assert len(data) < 1_000_000, (project, 'needlessly large preview')
    assert (dist / 'social' / f'{project}.svg').exists(), project
    checked = 0
    paths = set()
    for html in dist.rglob('*.html'):
        meta = Metadata(html.read_text())
        if 'og:title' not in meta.values: continue  # redirects intentionally have minimal heads
        for key in ['og:image','og:image:secure_url','twitter:image']:
            assert meta.one(key) == image_url, (project, html, key)
        assert meta.one('og:image:width') == '1200', html
        assert meta.one('og:image:height') == '630', html
        assert meta.one('og:image:type') == 'image/png', html
        assert meta.one('twitter:card') == 'summary_large_image', html
        assert meta.one('twitter:title') == meta.one('og:title'), html
        assert meta.one('twitter:description') == meta.one('og:description') == meta.one('description'), html
        assert meta.one('twitter:image:alt') == meta.one('og:image:alt'), html
        assert len(meta.one('og:image:alt')) > 20, html
        assert meta.one('og:site_name').startswith('JackTools.Net'), html
        assert meta.one('og:locale') == {'de':'de_DE','en':'en_GB','es':'es_ES','fr':'fr_FR'}[meta.language], html
        paths.add(html)
        checked += 1
    assert checked > 0, project
    # Every indexable URL in the sitemap must have a social head.
    sitemap = ET.fromstring((dist / 'sitemap.xml').read_text())
    for loc in sitemap.findall('{*}url/{*}loc'):
        path = urlsplit(loc.text).path
        target = dist / path.lstrip('/') / 'index.html'
        assert target in paths, (project, loc.text, 'missing share metadata')
    pages += checked
    print(f'{project}: {checked} page heads, PNG dimensions, local artwork and sitemap coverage OK')
print(f'Validated {pages} pages across {len(PROJECTS)} projects.')
