#!/usr/bin/env python3
"""Validate built sitemaps and their canonical/indexable targets, without dependencies.
Run after building all five projects: python3 scripts/check-sitemaps.py
"""
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

for project, host, count in [('timer', 'timer.jacktools.net', 12), ('clock', 'clock.jacktools.net', 4), ('stopwatch', 'stopwatch.jacktools.net', 4), ('company', 'jacktools.net', 1), ('breathe', 'breathe.jacktools.net', 4)]:
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
        if project != 'company':
            assert {link.get('hreflang') for link in alternatives} == {'en', 'de', 'es', 'fr', 'x-default'}, url
            assert len(alternatives) == 5, url
            for link in alternatives:
                assert link.get('rel') == 'alternate' and link.get('href') in urls, link.attrib
                if link.get('hreflang') == 'x-default':
                    assert urlsplit(link.get('href')).path.startswith('/en/'), url
        else:
            assert not alternatives
    robots = (dist / 'robots.txt').read_text()
    if project != 'company' or 'Disallow: /' not in robots:
        assert 'Sitemap: https://' + host + '/sitemap.xml' in robots, project
    print(f'{project}: valid XML, {count} canonical/indexable URLs, alternate links and robots.txt checked')
