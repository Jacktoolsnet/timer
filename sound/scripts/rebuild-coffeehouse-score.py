"""Optional symbolic-score rebuild with LilyPond 2.24; no network or audio.

Retain the unmodified Public Domain helper edition. Only omit its obsolete
paper settings from the temporary compilation input; musical content is intact.
"""
import argparse
import shutil
import subprocess
import tempfile
import importlib.util
from pathlib import Path
from score_midi import read_score

parser = argparse.ArgumentParser()
parser.add_argument('--lilypond', default='lilypond')
parser.add_argument('--keys', nargs='+', choices=['chopin-a','schumann-foreign','brahms-waltz'], default=['chopin-a','schumann-foreign','brahms-waltz'])
args = parser.parse_args()
scores = Path(__file__).resolve().with_name('scores')
edition = scores / 'chopin-a-edition'
with tempfile.TemporaryDirectory(prefix='jacktools-coffeehouse-') as directory:
    work = Path(directory)
    for key in args.keys:
        if key == 'chopin-a':
            shutil.copyfile(edition / 'header.ly', work / 'header.ly')
            text = (edition / 'chopin_prelude_op28_no7.ly').read_text()
            text = text.replace('\\include "paper-defs.ily"', '% Obsolete paper settings omitted for LilyPond 2.24.')
        else:
            text = (scores / (key + '-edition') / 'performance.ly').read_text()
        (work / (key + '.ly')).write_text(text)
        subprocess.run([args.lilypond, '-dno-print-pages', key + '.ly'], cwd=work, check=True)
        shutil.copyfile(work / (key + '.midi'), scores / (key + '.mid'))
        if key == 'schumann-foreign':
            spec = importlib.util.spec_from_file_location('form', Path(__file__).with_name('coffeehouse-score-form.py'))
            form = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(form)
            score = form.schumann_performance(read_score(scores / (key + '.mid')))
            (scores / (key + '.performance.mid')).write_bytes(form.midi_bytes(score))
print('Rebuilt Coffeehouse symbolic scores; no audio or external MIDI performance used.')
