"""Optional: rebuild repeats with locally installed LilyPond 2.24; no downloads.
Normal regeneration only needs Python. Source files remain unchanged.
"""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--lilypond',default='lilypond')
args=parser.parse_args()
scores=Path(__file__).with_name('scores')
with tempfile.TemporaryDirectory(prefix='jacktools-scores-') as directory:
 work=Path(directory)
 for key in ['gymno','elise','turca']:
  source=scores/(key+'.ly') if key!='turca' else scores/'turca-KV331_3_RondoAllaTurca.ly'
  text=source.read_text().replace('\\score {','\\score { \\unfoldRepeats ').replace('\\score{','\\score{ \\unfoldRepeats ')
  target=work/(key+'.ly');target.write_text(text)
  if key=='turca':shutil.copyfile(scores/'turca-KV331_3_RondoAllaTurcaNotes.ly',work/'KV331_3_RondoAllaTurcaNotes.ly')
  subprocess.run([args.lilypond,'-dno-print-pages',target.name],cwd=work,check=True)
  shutil.copyfile(work/(key+'.midi'),scores/(key+'.performance.mid'))
 print('Rebuilt three unfolded performances. Regenerate the library and audit the report.')
