"""Optional symbolic-score rebuild with LilyPond 2.24; no network or audio.

Retain the unmodified Public Domain helper edition. Only omit its obsolete
paper settings from the temporary compilation input; musical content is intact.
"""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--lilypond', default='lilypond')
args = parser.parse_args()
scores = Path(__file__).resolve().with_name('scores')
edition = scores / 'chopin-a-edition'
with tempfile.TemporaryDirectory(prefix='jacktools-coffeehouse-') as directory:
    work = Path(directory)
    shutil.copyfile(edition / 'header.ly', work / 'header.ly')
    text = (edition / 'chopin_prelude_op28_no7.ly').read_text()
    text = text.replace('\\include "paper-defs.ily"', '% Obsolete paper settings omitted for LilyPond 2.24.')
    (work / 'chopin-a.ly').write_text(text)
    subprocess.run([args.lilypond, '-dno-print-pages', 'chopin-a.ly'], cwd=work, check=True)
    shutil.copyfile(work / 'chopin-a.midi', scores / 'chopin-a.mid')
print('Rebuilt complete Chopin op.28/7 symbolic score; no audio or external performance used.')
