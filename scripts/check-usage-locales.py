#!/usr/bin/env python3
"""Build all tools first; check usage localization without network dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
TOOLS=['timer','clock','stopwatch','calculator','breathe','relax','scenescript','lava']
LANGS=['de','en','es','fr']
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(); self.lang=''; self.alternates={}; self.links=[]; self.noindex=False;self.article=False;self.content='';self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')
        if tag=='article':self.article=True
        if tag=='meta' and a.get('name')=='robots':self.noindex='noindex' in a.get('content','')
        if tag=='link' and a.get('hreflang'):self.alternates[a['hreflang']]=a['href']
        if tag=='a':self.links.append(a.get('href',''))
    def handle_endtag(self,tag):
        if tag=='article':self.article=False
    def handle_data(self,text):
        if self.article:self.content+=text+' '

for tool in TOOLS:
    dist=ROOT/tool/'dist'
    for lang in LANGS:
        html=(dist/lang/'usage/index.html').read_text()
        page=Page(html)
        assert page.lang==lang,(tool,lang,'html lang')
        assert not page.noindex,(tool,lang,'indexing policy')
        assert len(page.content)>700,(tool,lang,'missing content')
        for other in LANGS:
            assert f'/{other}/usage/' in page.links,(tool,lang,other,'document navigation')
            assert urlparse(page.alternates[other]).path==f'/{other}/usage/',(tool,lang,other,'hreflang')
        for route in ['privacy','legal']:
            legal_lang='de' if lang=='de' else 'en'
            assert f'/{legal_lang}/{route}/' in page.links,(tool,lang,route,'legal fallback')
        app=Page((dist/lang/'index.html').read_text())
        assert f'/{lang}/usage/' in app.links,(tool,lang,'footer')
        if lang in ['es','fr']:
            for route in ['privacy','legal']:
                assert not (dist/lang/route/'index.html').exists(),(tool,lang,route,'unexpected legal translation')
    for lang in ['de','en']:
        legal=Page((dist/lang/'privacy/index.html').read_text())
        assert 'es' not in legal.alternates and 'fr' not in legal.alternates,(tool,'privacy hreflang')
    sitemap=ET.fromstring((dist/'sitemap.xml').read_text())
    assert sum(node.text.endswith('/usage/') for node in sitemap.findall('{*}url/{*}loc')) == len(LANGS),(tool,'usage pages in sitemap')
    print(f'{tool}: 4 usage languages, links, hreflang and bilingual legal pages OK')
print('Validated 32 usage pages across 8 tools.')
