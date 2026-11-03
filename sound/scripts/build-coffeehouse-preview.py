"""Build one complete, explicitly unapproved Coffeehouse listening preview.

Does not publish a library slot or regenerate/overwrite the existing catalog.
Normal offline regeneration needs only Python's standard library.
"""
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('production', Path(__file__).with_name('build-song-library.py'))
production = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(production)


def build():
    with tempfile.TemporaryDirectory(prefix='jacktools-preview-') as directory:
        production.OUT = Path(directory)
        entry = production.build(('coffeehouse-chopin-prelude-a', 'chopin-a', 'coffeehouse', 72))
        song = json.loads((production.OUT / 'coffeehouse-chopin-prelude-a.song.json').read_text())
    # Two empty beats place the quarter pickup on beat 3. The current engine
    # requires even scene lengths: retain one explicitly documented silent
    # transport bar after the written final rest, rather than repeat the theme.
    song['scenes'][-1]['name'] = 'Final chord · transport tail'
    song['title'] = 'Prélude A-Dur · op.28/7 — Coffeehouse Preview'
    filename = 'coffeehouse-chopin-prelude-a.preview.song.json'
    entry.update(path='/examples/' + filename, bars=18, durationSeconds=45)
    entry['scopeLabel'] = dict(
        de='Hörvorschau: vollständiges Prélude mit Auftakt, nach benannter gemeinfreier Hilfsnotation. Historischer Einzelnotenabgleich und Hörabnahme noch offen.',
        en='Listening preview: complete Prelude and pickup, from the credited public-domain helper notation. Historical note-by-note comparison and listening review pending.',
        es='Vista previa: preludio completo con anacrusa, según la notación auxiliar de dominio público acreditada. Cotejo histórico y revisión auditiva pendientes.',
        fr='Préécoute : prélude complet avec anacrouse, selon la notation auxiliaire du domaine public créditée. Comparaison historique et écoute de validation à faire.')
    report = {**production.REPORT['coffeehouse-chopin-prelude-a'], 'bars': 18, 'durationSeconds': 45}
    return song, dict(status='preview_not_approved', catalogPublished=False, entry=entry, production=report)


if __name__ == '__main__':
    song, report = build()
    path = ROOT / 'public' / report['entry']['path'].lstrip('/')
    path.write_text(json.dumps(song, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'docs' / 'coffeehouse-preview-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'public/library/preview-catalog.json').write_text(json.dumps([report['entry']], ensure_ascii=False, indent=2) + '\n')
    print(f'{path.name}: 16 full bars + pickup, 168 source notes, 45 seconds including transport tail; selectable as preview, not approved catalog.')
