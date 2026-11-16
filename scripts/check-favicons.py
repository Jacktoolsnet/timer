#!/usr/bin/env python3
"""Check consistent green SVG favicons and versioned links in sources/builds."""
from pathlib import Path
import argparse
import json
import re
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
palette=json.loads((ROOT/'shared/favicon-palette.json').read_text())
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--built',action='store_true',help='Also check generated dist assets and localized pages')
args=parser.parse_args()
projects=['company','timer','clock','stopwatch','calculator','breathe','relax','scenescript','lava','metronome','sound','nulltopic/frontend']
for project in projects:
    root=ROOT/project
    name='jacktools-icon.svg' if project=='company' else 'favicon.svg'
    source=root/'public'/name
    content=source.read_text()
    svg=ET.fromstring(content)
    assert svg.tag.endswith('svg') and svg.get('viewBox'),source
    assert palette['green'] in content,(source,'missing Company brand green')
    assert not re.search(r'var\(|color-mix\(|#(?:ad5239|a64d35|c97850|8f4439|c87950|9e4833)\b',content,re.I),(source,'theme-dependent or old warm colors')
    layout=root/('src/components/Layout.astro' if project=='nulltopic/frontend' else 'src/layouts/Layout.astro')
    href=f'/{name}?v={palette["version"]}'
    assert f'href="{href}"' in layout.read_text(),(layout,'missing cache-versioned icon')
    if args.built:
        assert (root/'dist'/name).read_bytes()==source.read_bytes(),(project,'outdated build')
        path=root/'dist'/('index.html' if project=='nulltopic/frontend' else 'de/index.html')
        assert href in path.read_text(),(path,'outdated favicon URL')
    print(f'{project}: green favicon and versioned URL OK')
