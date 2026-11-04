"""Split the existing complete Canon performance; no new transcription or notes.
Run after build-song-library.py, or standalone. Source and attribution stay intact.
"""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / 'public/library'
NAMES = ['Violine I', 'Violine II', 'Violine III', 'Basso']


def build():
    source = json.loads((LIBRARY / 'classical-canon.song.json').read_text())
    assert [t['id'] for t in source['tracks']] == ['violin1', 'violin2', 'violin3', 'basso']
    sets = []
    for lane, name in enumerate(NAMES):
        script = deepcopy(source)
        # Retain the common work title and complete credits for whole-song videos.
        # Keep source lane indices, seeds and scene boundaries for identical phrasing.
        for i, track in enumerate(script['tracks']):
            track['volume'] = round(track['volume'] * 2, 6) if i == lane else 0
        for scene in script['scenes']:
            scene['parts'] = [p for p in scene['parts'] if p['track'] == source['tracks'][lane]['id']]
        tracks = []
        for i in range(9):
            tracks.append(dict(enabled=i == lane, mute=False,
                instrument=source['tracks'][i]['instrument'] if i < 4 else 'strings',
                score=None, points=[False] * 16,
                volume=script['tracks'][i]['volume'] if i < 4 else 0,
                pitch=0, phase=0, direction=1, directionMode='forward',
                randomDynamics=False, morph=None))
        settings = dict(version=2, style=source['style'], bpm=source['bpm'], volume=.4,
            meter=source['meter'], tempoUnit=source['tempoUnit'],
            background='off', center='ring', orbit='comet', visualization='constellation', constellationVariant='stars',
            tracks=tracks, songScript=script)
        sets.append(dict(name=name, muted=False, settings=settings, barOffset=0))
    sets += [dict(name='', muted=False, settings=None, barOffset=0) for _ in range(5)]
    project = dict(format='jacktools-orbit-project', version=1, active=0,
        bpm=source['bpm'], volume=.4,
        clock=dict(meter=source['meter'], tempoUnit=source['tempoUnit'], quarters=4, steps=16, swing=0), sets=sets)
    # Four simultaneous sets apply 1/sqrt(4) master trim. Doubling each sole voice
    # above compensates exactly, preserving the existing violin:bass balance.
    out = LIBRARY / 'classical-canon.orbit.json'
    out.write_text(json.dumps(project, ensure_ascii=False, indent=2) + '\n')
    print(f'{out.name}: four synchronized original parts, {sum(s["bars"] for s in source["scenes"])} bars')


if __name__ == '__main__':
    build()
