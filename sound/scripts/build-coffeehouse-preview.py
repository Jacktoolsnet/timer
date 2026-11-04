"""Build three complete, explicitly labelled Coffeehouse listening productions.

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
        de='Hörvorschau: vollständiges Prélude mit Auftakt, nach benannter gemeinfreier Hilfsnotation.',
        en='Listening preview: complete Prelude and pickup, from the credited public-domain helper notation.',
        es='Vista previa: preludio completo con anacrusa, según la notación auxiliar de dominio público acreditada.',
        fr='Préécoute : prélude complet avec anacrouse, selon la notation auxiliaire du domaine public créditée.')
    report = {**production.REPORT['coffeehouse-chopin-prelude-a'], 'bars': 18, 'durationSeconds': 45}
    return song, dict(status='preview_not_approved', catalogPublished=False, entry=entry, production=report)


def build_addition(key, identifier, bpm):
    with tempfile.TemporaryDirectory(prefix='jacktools-coffeehouse-') as directory:
        production.OUT = Path(directory)
        entry = production.build((identifier, key, 'coffeehouse', bpm))
        song = json.loads((production.OUT / (identifier + '.song.json')).read_text())
    filename = identifier + '.preview.song.json'
    song['title'] = production.WORKS[key]['title'] + ' — Coffeehouse'
    entry['path'] = '/examples/' + filename
    entry['scopeLabel'] = dict(
        de=('Vollständiges Stück, beide Wiederholungen (AABB), vier Stimmen; warmer Coffeehouse-Mix.' if key=='schumann-foreign' else 'Vollständige Walzer-Solofassung mit Eröffnungswiederholung und Triolen-Coda; Coffeehouse-Mix nach benannter PD-Hilfsnotation.'),
        en=entry['scope'],
        es='Pieza completa con repeticiones y final, mezcla Coffeehouse según la notación auxiliar acreditada de dominio público.',
        fr='Pièce complète avec reprises et fin, mix Coffeehouse selon la notation auxiliaire du domaine public créditée.')
    return song, dict(status='preview_not_approved', catalogPublished=False, overlaySelectable=True, entry=entry, production=production.REPORT[identifier])


def build_all():
    return [build(),
            build_addition('schumann-foreign','coffeehouse-schumann-foreign',72),
            build_addition('brahms-waltz','coffeehouse-brahms-waltz',104)]


if __name__ == '__main__':
    productions = build_all()
    for song, report in productions:
        path = ROOT / 'public' / report['entry']['path'].lstrip('/')
        path.write_text(json.dumps(song, ensure_ascii=False, indent=2) + '\n')
        print(f"{path.name}: {report['production']['sourceNotes']} source notes, {report['production']['durationSeconds']}s; selectable in overlay.")
    (ROOT / 'docs/coffeehouse-preview-report.json').write_text(json.dumps(productions[0][1], ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'docs/coffeehouse-productions-report.json').write_text(json.dumps([r for _,r in productions], ensure_ascii=False, indent=2) + '\n')
    import runpy
    orbits = runpy.run_path(str(Path(__file__).with_name('build-library-orbits.py')))
    manifest = orbits['link_catalog']([r['entry'] for _, r in productions])
    (ROOT / 'public/library/preview-catalog.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    orbits['build']([entry['id'] for entry in manifest])
