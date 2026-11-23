#!/usr/bin/env python3
"""Validate built sitemaps and their canonical/indexable targets, without dependencies.
Run after building all ten projects: python3 scripts/check-sitemaps.py
"""
import sys
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}

class Metadata(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.canonical = None
        self.noindex = False
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical = a.get('href')
        if tag == 'meta' and a.get('name') == 'robots':
            self.noindex = 'noindex' in a.get('content', '')

projects = [('metronome', 'metronome.jacktools.net', 8), ('timer', 'timer.jacktools.net', 16), ('clock', 'clock.jacktools.net', 8), ('stopwatch', 'stopwatch.jacktools.net', 8), ('calculator', 'calculator.jacktools.net', 8), ('company', 'jacktools.net', 39), ('breathe', 'breathe.jacktools.net', 8), ('relax', 'relax.jacktools.net', 8), ('lava', 'lava.jacktools.net', 8), ('scenescript', 'scenescript.jacktools.net', 12)]
if sys.argv[1:]:
    assert set(sys.argv[1:]) <= {project for project, _, _ in projects}, 'Unknown project'
    projects = [entry for entry in projects if entry[0] in sys.argv[1:]]
for project, host, count in projects:
    dist = ROOT / project / 'dist'
    raw = (dist / 'sitemap.xml').read_bytes()
    assert raw.startswith(b'<?xml version="1.0" encoding="UTF-8"?>\n'), project
    root = ET.fromstring(raw)
    assert root.tag == '{' + NS['s'] + '}urlset', project
    entries = root.findall('s:url', NS)
    assert len(entries) == count, (project, len(entries))
    urls = [entry.findtext('s:loc', namespaces=NS) for entry in entries]
    assert len(set(urls)) == count, project
    for entry, url in zip(entries, urls):
        parts = urlsplit(url)
        assert parts.scheme == 'https' and parts.netloc == host and not parts.query and not parts.fragment, url
        assert parts.path.endswith('/'), url
        target = dist / parts.path.lstrip('/') / 'index.html'
        meta = Metadata(target.read_text())
        assert meta.canonical == url and not meta.noindex, (url, meta.canonical, meta.noindex)
        alternatives = entry.findall('x:link', NS)
        expected_languages = set() if project == 'company' and parts.path.startswith('/de/blog/') else {'en', 'de', 'es', 'fr', 'x-default'}
        assert {link.get('hreflang') for link in alternatives} == expected_languages, url
        assert len(alternatives) == len(expected_languages), url
        for link in alternatives:
            assert link.get('rel') == 'alternate' and link.get('href') in urls, link.attrib
            if link.get('hreflang') == 'x-default':
                assert urlsplit(link.get('href')).path.startswith('/en/'), url
    if project != 'company':
        for language in ['de', 'en', 'es', 'fr']:
            assert f'https://{host}/{language}/usage/' in urls, project
        for language in ['de', 'en']:
            for route in ['legal', 'privacy']:
                assert Metadata((dist / language / route / 'index.html').read_text()).noindex, (project, language, route)
    else:
        for route in ['impressum', 'datenschutz', 'nutzungshinweise']:
            assert Metadata((dist / route / 'index.html').read_text()).noindex, route
    robots = (dist / 'robots.txt').read_text()
    if project != 'company' or 'Disallow: /' not in robots:
        assert 'Sitemap: https://' + host + '/sitemap.xml' in robots, project
    print(f'{project}: valid XML, {count} canonical/indexable URLs, alternate links and robots.txt checked')
