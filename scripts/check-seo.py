#!/usr/bin/env python3
"""Check published projects' built SEO metadata without network or dependencies.
Build company, timer, clock, stopwatch, breathe and relax before running.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ['company', 'timer', 'clock', 'stopwatch', 'breathe', 'relax']

class Metadata(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.visible = ''
        self.in_script = False
        self.title = ''
        self.h1 = []
        self.description = ''
        self.canonical = ''
        self.lang = ''
        self.alternates = {}
        self.og = {}
        self.schemas = []
        self.robots = ''
        self.template = 0
        self.in_title = self.in_h1 = self.in_json = False
        self.json = ''
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'template':
            self.template += 1
        if self.template:
            return
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'title': self.in_title = True
        if tag == 'h1': self.in_h1 = True; self.h1.append('')
        if tag == 'meta':
            if a.get('name') == 'description': self.description = a.get('content', '')
            if a.get('name') == 'robots': self.robots = a.get('content', '')
            if a.get('property', '').startswith('og:'): self.og[a['property']] = a.get('content')
        if tag == 'link':
            if a.get('rel') == 'canonical': self.canonical = a.get('href')
            if a.get('hreflang'): self.alternates[a['hreflang']] = a.get('href')
        if tag == 'script': self.in_script = True
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_json = True; self.json = ''

    def handle_endtag(self, tag):
        if tag == 'template': self.template -= 1; return
        if self.template: return
        if tag == 'script': self.in_script = False
        if tag == 'title': self.in_title = False
        if tag == 'h1': self.in_h1 = False
        if tag == 'script' and self.in_json:
            self.schemas.append(json.loads(self.json)); self.in_json = False

    def handle_data(self, data):
        if self.template: return
        if not self.in_script and not self.in_title: self.visible += data
        if self.in_title: self.title += data
        if self.in_h1: self.h1[-1] += data
        if self.in_json: self.json += data

seen_titles, seen_descriptions, pages = set(), set(), 0
for project in PROJECTS:
    dist = ROOT / project / 'dist'
    sitemap = ET.fromstring((dist / 'sitemap.xml').read_text())
    for entry in sitemap.findall('{*}url'):
        url = entry.findtext('{*}loc')
        path = urlsplit(url).path
        meta = Metadata((dist / path.lstrip('/') / 'index.html').read_text())
        assert meta.canonical == url, (url, 'canonical')
        assert 'noindex' not in meta.robots, (url, 'noindex')
        assert len(meta.h1) == 1 and meta.h1[0].strip(), (url, 'H1', meta.h1)
        assert meta.title not in seen_titles, (url, 'duplicate title')
        assert meta.description not in seen_descriptions, (url, 'duplicate description')
        assert 15 <= len(meta.title) <= 110, (url, 'title length')
        assert 70 <= len(meta.description) <= 220, (url, 'description length')
        assert meta.og.get('og:title') and meta.og.get('og:description') == meta.description, (url, 'Open Graph')
        if project != 'company':
            assert meta.lang == path.split('/')[1], (url, 'language')
            assert set(meta.alternates) == {'de', 'en', 'es', 'fr', 'x-default'}, (url, 'hreflang')
        for schema in meta.schemas:
            if schema.get('@type') == 'WebApplication':
                assert schema['description'] in meta.visible, (url, 'schema description must be visible')
                assert schema['name'] in meta.visible, (url, 'schema name must be visible')
                assert all(feature in meta.visible for feature in schema['featureList']), (url, 'schema features must be visible')
        seen_titles.add(meta.title); seen_descriptions.add(meta.description); pages += 1
        print(f'OK {url}: {meta.title}')
assert pages == 29, pages
print(f'Validated {pages} canonical pages across {len(PROJECTS)} published projects.')
