"""Offline integrity and roadmap checks for historical score evidence.

No network, PDF execution, third-party modules, or production-file writes.
This checks evidence integrity, NOT musical accuracy or legal clearance.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'


def check(docs=DOCS):
    folder = docs / 'sources' / 'coffeehouse'
    manifest = json.loads((folder / 'manifest.json').read_text())
    plan = json.loads((docs / 'library-expansion-plan.json').read_text())
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    require(manifest['format'] == 'jacktools-historical-score-evidence', 'Unknown format')
    require(manifest['version'] == 1, 'Unsupported evidence version')
    tracks = next(s['tracks'] for s in plan['styles'] if s['style'] == 'coffeehouse')
    planned = {t['slot']: t for t in tracks}
    records = manifest['records']
    require(len(records) == 3, 'Expected three Coffeehouse sources')
    require(len({r['slot'] for r in records}) == len(records), 'Duplicate evidence slot')
    require({r['slot'] for r in records} == set(planned), 'Evidence/plan slots differ')
    for record in records:
        slot = record['slot']
        evidence = record['evidencePdf']
        path = (folder / evidence['path']).resolve()
        require(path.parent == folder.resolve(), f'{slot}: unsafe evidence path')
        if path.parent != folder.resolve():
            continue
        try:
            raw = path.read_bytes()
        except OSError as exc:
            errors.append(f'{slot}: {exc}')
            continue
        require(raw.startswith(b'%PDF-'), f'{slot}: not a PDF')
        require(len(raw) == evidence['bytes'], f'{slot}: byte count mismatch')
        require(hashlib.sha256(raw).hexdigest() == evidence['sha256'], f'{slot}: SHA-256 mismatch')
        pages = evidence['originalPdfPages']
        require(pages == [1, record['scoreLocation']['pdfPage']], f'{slot}: wrong page mapping')
        require(all(1 <= p <= record['originalPdf']['pages'] for p in pages), f'{slot}: page out of bounds')
        original = record['originalPdf']['sha256']
        require(len(original) == 64 and all(c in '0123456789abcdef' for c in original), f'{slot}: invalid original digest')
        require(record['inspection']['titlePageViewed'] and record['inspection']['scorePageViewed'], f'{slot}: inspection missing')
        track = planned.get(slot)
        if track:
            require(track['editionCandidate']['fileId'] == record['fileId'], f'{slot}: edition mismatch')
            require(track['workPage'] == record['workPage'], f'{slot}: work mismatch')
            require(track['evidenceSlot'] == slot, f'{slot}: evidence link mismatch')
            if record['publicationGate'] == 'not_ready':
                require(not track['production']['catalogPublished'], f'{slot}: unready source published')
                require(track['status'] in ('historical_pages_inspected_not_produced', 'musical_preview_not_approved'), f'{slot}: misleading status')
    return errors


if __name__ == '__main__':
    problems = check()
    if problems:
        raise SystemExit('\n'.join(problems))
    print('3 historical source packets verified; transcription/publication still pending.')
