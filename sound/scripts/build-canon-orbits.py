"""Split the existing Canon performances; no new transcription or notes.
Run after build-song-library.py, or standalone. Source and attribution stay intact.
"""
from copy import deepcopy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / 'public/library'
PRODUCTIONS = {
    'classical-canon': [
        ('Violine I', ['violin1']), ('Violine II', ['violin2']),
        ('Violine III', ['violin3']), ('Basso', ['basso']),
    ],
    'house-canon': [
        ('Kanon I · Pluck', ['voice1']), ('Kanon II · E-Piano', ['voice2']),
        ('Kanon III · Streicher', ['voice3']),
        ('Bass & Klavier', ['ground', 'continuo']),
        ('Drums · Kick, Clap & Hi-Hat', ['kick', 'rim', 'hat']),
    ],
}


def build_project(identifier, groups):
    source = json.loads((LIBRARY / (identifier + '.song.json')).read_text())
    ids = [t['id'] for t in source['tracks']]
    assigned = [track for _, group in groups for track in group]
    assert sorted(assigned) == sorted(ids) and len(set(assigned)) == len(assigned)
    sets = []
    trim_compensation = math.sqrt(len(groups))
    for name, group in groups:
        script = deepcopy(source)
        # Keep title/credits, source lane indices, seeds and every scene boundary.
        for track in script['tracks']:
            track['volume'] = round(track['volume'] * trim_compensation, 12) if track['id'] in group else 0
            assert 0 <= track['volume'] <= 1
        for scene in script['scenes']:
            scene['parts'] = [p for p in scene['parts'] if p['track'] in group]
        tracks = []
        for i in range(9):
            tracks.append(dict(enabled=i < len(ids) and ids[i] in group, mute=False,
                instrument=source['tracks'][i]['instrument'] if i < len(ids) else 'strings',
                score=None, points=[False] * 16,
                volume=script['tracks'][i]['volume'] if i < len(ids) else 0,
                pitch=0, phase=0, direction=1, directionMode='forward',
                randomDynamics=False, morph=None))
        settings = dict(version=2, style=source['style'], bpm=source['bpm'], volume=.4,
            meter=source['meter'], tempoUnit=source['tempoUnit'],
            background='off', center='ring', orbit='comet', visualization='constellation', constellationVariant='stars',
            tracks=tracks, songScript=script)
        sets.append(dict(name=name, muted=False, settings=settings, barOffset=0))
    sets += [dict(name='', muted=False, settings=None, barOffset=0) for _ in range(9-len(groups))]
    quarters = source['meter']['numerator'] * 4 / source['meter']['denominator']
    if quarters.is_integer():
        quarters = int(quarters)
    project = dict(format='jacktools-orbit-project', version=1, active=0,
        bpm=source['bpm'], volume=.4,
        clock=dict(meter=source['meter'], tempoUnit=source['tempoUnit'], quarters=quarters, steps=quarters*4, swing=0), sets=sets)
    # The engine applies 1/sqrt(occupied sounding sets) at the master. Compensate
    # source track gains above to retain the original balance without extra notes.
    out = LIBRARY / (identifier + '.orbit.json')
    out.write_text(json.dumps(project, ensure_ascii=False, indent=2) + '\n')
    print(f'{out.name}: {len(groups)} synchronized groups, {sum(s["bars"] for s in source["scenes"])} bars')


def build():
    for identifier, groups in PRODUCTIONS.items():
        build_project(identifier, groups)


if __name__ == '__main__':
    build()
