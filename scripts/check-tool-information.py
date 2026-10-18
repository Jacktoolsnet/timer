#!/usr/bin/env python3
"""Check built, visible tool facts, structured data and links in every language."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
LANGS = ['de', 'en', 'es', 'fr']
TOOLS = {'timer':['','pomodoro','training'],'clock':[''],'stopwatch':[''],'breathe':[''],'relax':[''],'calculator':[''],'scenescript':[''],'lava':['']}
PUBLISHED = {'timer','clock','stopwatch','breathe','relax','calculator'}

class Information(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.depth=0; self.section_depth=0; self.count=0; self.text=''; self.links=[]; self.schemas=[]; self.script=False; self.raw='';self.feed(html)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'data-tool-information' in a:
            self.count+=1;self.depth=1
        elif self.depth and tag=='section':self.depth+=1
        if self.depth and tag=='a':self.links.append(a['href'])
        if tag=='script' and a.get('type')=='application/ld+json':self.script=True;self.raw=''
    def handle_endtag(self,tag):
        if tag=='section' and self.depth:self.depth-=1
        if tag=='script' and self.script:self.schemas.append(json.loads(self.raw));self.script=False
    def handle_data(self,data):
        if self.depth:self.text+=data
        if self.script:self.raw+=data

count=0
for project,routes in TOOLS.items():
    for route in routes:
        for lang in LANGS:
            path=ROOT/project/'dist'/lang/route/'index.html'
            html=path.read_text()
            info=Information(html)
            assert info.count==1,(path,'one visible fact section required')
            apps=[x for x in info.schemas if x.get('@type')=='WebApplication']
            assert len(apps)==1,(path,'one application schema required')
            schema=apps[0]
            for key in ['name','description']:
                assert schema[key] in info.text,(path,'invisible schema fact',key)
            assert all(feature in info.text for feature in schema['featureList']),(path,'invisible features')
            assert schema['inLanguage']==lang,(path,'wrong language')
            url=f'https://{project}.jacktools.net/{lang}/'+(route+'/' if route else '')
            assert schema['url']==url and schema['@id']==url+'#application',(path,'wrong application URL')
            assert schema['isAccessibleForFree'] is True and schema['offers']['price']=='0',(path,'free offer')
            assert 'aggregateRating' not in schema and 'review' not in schema,(path,'no invented reviews')
            assert len(info.links)>=2,(path,'related links')
            for link in info.links:
                parts=urlsplit(link);host=parts.hostname.split('.')[0]
                assert host in PUBLISHED,(path,'link to unpublished tool',link)
                assert parts.path.split('/')[1]==lang,(path,'wrong link language',link)
                assert (ROOT/host/'dist'/parts.path.lstrip('/')/'index.html').exists(),(path,'missing link target',link)
            count+=1
# The machine-readable publisher is also described by the homepage's entity graph.
home=Information((ROOT/'company/dist/index.html').read_text())
graph=next(x['@graph'] for x in home.schemas if '@graph' in x)
assert {'Organization','WebSite','ItemList'}=={x['@type'] for x in graph}
print(f'Validated {count} localized tool pages, related links and the homepage entity graph.')
