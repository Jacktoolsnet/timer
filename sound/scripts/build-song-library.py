"""Deterministic native-meter productions from vendored, attributed score events.
Offline: python3 scripts/build-song-library.py. No runtime MIDI player or samples.
See scores/README.md and public/library/SOURCES.md for provenance and limitations.
"""
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
from score_midi import read_score

ROOT=Path(__file__).resolve().parents[1]
SCORES=Path(__file__).with_name('scores')
OUT=ROOT/'public/library'
# BPM always refers to tempoUnit, NOT implicitly to the meter denominator.
WORKS={
 'nacht':dict(title='Eine kleine Nachtmusik · I',composer='W. A. Mozart (1756–1791)',meter=(4,4),bpm=132,pickup=0),
 'turca':dict(title='Rondo alla turca',composer='W. A. Mozart (1756–1791)',meter=(2,4),bpm=108,pickup=1),
 'elise':dict(title='Für Elise',composer='L. van Beethoven (1770–1827)',meter=(3,8),bpm=144,pickup=.5),
 'entertainer':dict(title='The Entertainer',composer='Scott Joplin (1868–1917)',meter=(2,4),bpm=88,pickup=0),
 'maple':dict(title='Maple Leaf Rag',composer='Scott Joplin (1868–1917)',meter=(2,4),bpm=96,pickup=.5),
 'winners':dict(title='The Easy Winners',composer='Scott Joplin (1868–1917)',meter=(2,4),bpm=90,pickup=0),
 'gymno':dict(title='Gymnopédie No. 1',composer='Erik Satie (1866–1925)',meter=(3,4),bpm=60,pickup=0),
 'traum':dict(title='Träumerei',composer='Robert Schumann (1810–1856)',meter=(4,4),bpm=56,pickup=1),
 'prelude':dict(title='Prélude e-Moll · op. 28/4',composer='Frédéric Chopin (1810–1849)',meter=(2,2),bpm=56,pickup=1),
 'canon-original':dict(title='Canon in D · 3 Violinen und Basso',composer='Johann Pachelbel (1653–1706)',meter=(4,4),bpm=55,pickup=0),
 'canon':dict(title='Canon in D · Canonic Lights',composer='Johann Pachelbel (1653–1706)',meter=(4,4),bpm=76,pickup=0),
 'ode':dict(title='Ode an die Freude · Hymnenthema',composer='L. van Beethoven (1770–1827)',meter=(4,4),bpm=124,pickup=0),
 'chopin-a':dict(title='Prélude A-Dur · op.28/7',composer='Frédéric Chopin (1810–1849)',meter=(3,4),bpm=72,pickup=1),
 'schumann-foreign':dict(title='Von fremden Ländern und Menschen · op.15/1',composer='Robert Schumann (1810–1856)',meter=(2,4),bpm=72,pickup=0),
 'brahms-waltz':dict(title='Walzer As-Dur · op.39/15',composer='Johannes Brahms (1833–1897)',meter=(3,4),bpm=104,pickup=0),
}
ENTRIES=[
 ('classical-canon','canon-original','classical',55),
 ('classical-nachtmusik','nacht','classical',132),
 ('classical-turca','turca','classical',108),
 ('house-canon','canon','house',122),
 ('house-ode','ode','house',124),
 ('house-elise','elise','house',144),
 ('jazz-entertainer','entertainer','jazz',88),
 ('jazz-maple-leaf','maple','jazz',96),
 ('jazz-easy-winners','winners','jazz',90),
 ('lofi-gymnopedie','gymno','lofi',60),
 ('lofi-traeumerei','traum','lofi',56),
 ('lofi-prelude','prelude','lofi',56),
]
# The engine's legacy instrument registers: score pitch C4=0 is sounding C4
# for piano/strings, but bass sounds two octaves lower, cello one octave lower.
REGISTER={'bass':24,'doublebass':24,'cello':12,'guitar':12,'horn':12,'organ':12}
REPORT={}

def load(key):
 path=SCORES/(key+'.performance.mid')
 if not path.exists():path=SCORES/(key+'.mid')
 score=read_score(path)
 assert score['meters']==[(0.,*WORKS[key]['meter'])],(key,score['meters'])
 return score,path

def build(entry):
 id,key,style,bpm=entry;work=WORKS[key];num,den=work['meter'];qbar=num*4/den
 score,path=load(key);source=json.loads((SCORES/(key+'.source.json')).read_text())
 page=source['page']
 offset=qbar-work['pickup'] if work['pickup'] else 0
 # IDs are independent of instrument names; no instrument switching during notes.
 instruments={};levels={};timeline=defaultdict(list)
 def track(id,instrument,level):
  instruments[id]=instrument;levels[id]=level
 def add(id,at,duration,pitch,velocity=80,generated=False):
  assert id in instruments
  assert duration>0 and at>=0
  timeline[id].append((at,duration,pitch,velocity,generated))
 def transfer(id,notes,shift=offset,select=lambda n:True):
  for a,d,p,v in notes:
   if select((a,d,p,v)):add(id,a+shift,d,p,v)
 original_count=sum(len(t['notes']) for t in score['tracks'])
 if key=='canon-original':
  # Complete four-part score. Keep the score's entrances, bass and ending:
  # no invented imitation, harmony, introduction, doubling, arpeggios or coda.
  assert len(score['tracks'])==4
  assert [t['name'] for t in score['tracks']]==['violinI:','violinII:','violinIII:','violoncello:']
  for i,t in enumerate(score['tracks']):
   tr='violin'+str(i+1) if i<3 else 'basso'
   track(tr,'strings' if i<3 else 'cello',.32 if i<3 else .30)
   transfer(tr,t['notes'],shift=0)
  end=score['end']
  scope='Complete four-part Canon score: three violins and bass, with original entrances and ending; no invented voices or coda. Synthesized interpretation.'
 elif key=='canon':
  # Full licensed single-violin source, not a claimed Urtext/full original score.
  # 4-bar ground cycle makes the delayed imitations harmonically compatible.
  for n,level in enumerate([.36,.27,.22]):
   tr='voice'+str(n+1);track(tr,'strings' if style=='classical' else ['pluck','epiano','strings'][n],level)
   transfer(tr,score['tracks'][0]['notes'],shift=16+n*16)
  track('ground','cello' if style=='classical' else 'bass',.31)
  track('continuo','harp' if style=='classical' else 'piano',.17)
  music_end=16+score['end']+32
  # D A Bm F#m G D G A, with voice-led upper inversions, not root-position blocks.
  roots=[50,45,47,42,43,50,43,45]
  voicings=[[66,69,74],[64,69,73],[66,71,74],[66,69,73],[67,71,74],[66,69,74],[67,71,74],[64,69,73]]
  for i in range(math.ceil(music_end/2)):
   a=i*2;r=roots[i%8];c=voicings[i%8]
   add('ground',a,1.94,r,74,True)
   for j in range(4):add('continuo',a+j*.5,.46,c[[0,1,2,1][j]],55,True)
  # Four-bar composed resolution after all source voices have finished.
  for n in range(3):add('voice'+str(n+1),music_end,8,[74,69,66][n],65,True)
  add('ground',music_end,8,50,65,True)
  for j,p in enumerate([62,66,69,74,78,81]):add('continuo',music_end+j*.5,2,p,62-j*4,True)
  end=music_end+16
  scope='Full 44-bar violin source; free three-voice canon, ground and coda. Not the complete original score.'
 elif key=='ode':
  # The complete 16-bar SATB hymn setting, NOT the Ninth Symphony finale.
  track('theme','epiano',.42);track('harmony','piano',.25)
  for start in [32,128]:
   transfer('theme',score['tracks'][0]['notes'],shift=start)
   transfer('harmony',score['tracks'][1]['notes'],shift=start)
  # Instrumental introduction / breakdown / outro use actual source bass/chords.
  track('bass','bass',.28);track('air','pad',.12)
  low=score['tracks'][1]['notes']
  for start,length in [(0,32),(96,32),(192,32)]:
   for a in range(0,length,4):
    local=a%64
    active=[p for t,d,p,v in low if t<=local<t+d]
    root=min(active or [43])
    add('bass',start+a,1.7,root,70,True)
    chord=sorted(set(p for t,d,p,v in score['tracks'][0]['notes'] if t<=local<t+d))
    for p in chord:add('air',start+a,3.7,p,51,True)
  # Bass during both full theme passes follows the actual score, not a fixed loop.
  for start in [32,128]:
   for a,d,p,v in low:
    if p<55:add('bass',start+a,min(d,.85),p,v,True)
  end=224
  scope='Complete 16-bar SATB hymn setting, twice, with original intro/break/outro. Not the complete symphony.'
 elif style=='classical' and key=='nacht':
  for i,t in enumerate(score['tracks']):
   tr='voice'+str(i+1);track(tr,'cello' if i==3 else 'strings',[.38,.29,.25,.32][i]);transfer(tr,t['notes'])
  end=score['end']+offset
  scope='Complete first-movement score MIDI, including its encoded repeats; string ensemble.'
 elif style=='coffeehouse':
  # Quiet acoustic lead, warm inner harmony and a soft, correctly registered
  # upright bass. No generic drum loop, extra chord cycle or duplicated theme.
  track('piano','piano',.46)
  track('warmth','epiano',.23)
  track('upright','doublebass',.23)
  if key=='chopin-a':
   transfer('piano',score['tracks'][0]['notes'])
   for t in score['tracks'][1:]:
    transfer('warmth',t['notes'],select=lambda n:n[2]>=48)
    transfer('upright',t['notes'],select=lambda n:n[2]<48)
  else:
   # Source timing/pitches stay untouched. Shape eight-bar phrases and bring
   # the top of Brahms's chords forward instead of equally loud block chords.
   lead=score['tracks'][0]['notes']
   highest={a:max(n[2] for n in lead if n[0]==a) for a,_,_,_ in lead}
   for a,d,p,v in lead:
    phrase=.88+.12*math.sin(math.pi*(a%(qbar*8))/(qbar*8))
    tone=1 if key=='schumann-foreign' else 1.10 if p==highest[a] else .82
    ending=1-.16*max(0,(a-(score['end']-qbar*4))/(qbar*4))
    add('piano',a,d,p,min(120,round(v*phrase*tone*ending)))
   for i,t in enumerate(score['tracks'][1:],1):
    if key=='schumann-foreign':
     transfer('upright' if i==2 else 'warmth',t['notes'])
    else:
     transfer('warmth',t['notes'],select=lambda n:n[2]>=48)
     transfer('upright',t['notes'],select=lambda n:n[2]<48)
  end=score['end']+offset
  scope='Complete 16-bar Prelude with quarter-note pickup; PD helper edition, historical scan comparison pending. Coffeehouse preview, not an approved edition.'
  if key=='schumann-foreign':scope='Complete 22-bar piece, both historical repeats played (AABB, 44 bars); four source voices. PD helper notation; scan reconciliation pending.'
  elif key=='brahms-waltz':scope='Complete 44-bar played solo Waltz, including written-out opening repeat and triplet coda. PD Joseffy/Rude helper notation; not a first-edition replica.'
 else:
  track('lead','pluck' if style=='house' else 'piano' if style in ('classical','jazz') else 'epiano',.43 if style!='house' else .36)
  track('inner','piano' if style in ('classical','jazz','house') else 'epiano',.28 if style!='house' else .22)
  track('bass','doublebass' if style=='jazz' else 'cello' if style=='lofi' else 'bass',.26)
  # Full source hands and countervoices, including chromatic harmony.
  transfer('lead',score['tracks'][0]['notes'])
  for t in score['tracks'][1:]:
   transfer('inner',t['notes'],select=lambda n:style=='classical' or n[2]>=48)
   if style!='classical':transfer('bass',t['notes'],select=lambda n:n[2]<48)
  end=score['end']+offset
  scope='Complete score-event sequence and all source voices; repeats as encoded in the vendored performance.'
 # Pad to an EVEN number of bars for the two-bar transport; no invented repeats.
 bars=math.ceil((end-1e-8)/qbar)
 bars+=bars%2
 total=bars*qbar
 # Native-meter drum arrangements: 3/8 gets THREE eighth pulses, NOT a hidden 4/4.
 # Ragtime is straight, with very restrained percussion; no forced jazz swing.
 if style not in ('classical','coffeehouse'):
  track('kick','kick',.28 if style=='house' else .09 if style=='lofi' else .07)
  track('rim','clap' if style=='house' else 'rim',.12 if style=='house' else .055)
  track('hat','hat',.075 if style=='house' else .035)
  for b in range(bars):
   # Intro/break/outro filtering without dropping any source melody notes.
   breakbar=style=='house' and (b%32 in range(24,28)) and b<bars-8
   tail=b>=bars-2
   if tail:continue
   pulse=.5 if den==8 else 1
   count=round(qbar/pulse)
   strength=(.72 if b<4 or b>=bars-8 else 1)
   for step in range(count):
    a=b*qbar+step*pulse
    if not breakbar and (style=='house' or step==0):
     add('kick',a,min(.12,pulse*.3),60,84*strength,True)
    if step%2==1:
     add('rim',a+.008,min(.1,pulse*.25),60,(64 if style=='house' else 48)*strength,True)
    for half in range(2):
     if style=='lofi' and half==0:continue
     add('hat',a+half*pulse/2,min(.065,pulse/4),60,(48 if half else 35)*strength,True)
   # A short turnaround every 16 bars, not an identical fill every two bars.
   if style=='house' and b%16==15 and not breakbar:
    for j in range(3):
     add('rim',(b+1)*qbar-pulse+j*pulse/3,pulse/8,60,42+j*7,True)
 # Convert to bounded two-bar scenes. Whole-source events are never truncated;
 # sustained notes crossing a scene boundary are split into rearticulations.
 window=num*2;chunks=int(bars/2);scenes=[];split_count=0;emitted=0;minimum=max(.016,window*.002)
 for i in range(chunks):
  begin=i*2*qbar;finish=begin+2*qbar;parts=[]
  for tr,events in timeline.items():
   output=[]
   for a,d,p,v,generated in events:
    if a>=finish-1e-8 or a+d<=begin+1e-8:continue
    onset=max(begin,a);stop=min(finish,a+d)
    at=(onset-begin)*den/4;duration=(stop-onset)*den/4
    if duration<minimum:
     # Retain short grace notes, fitting them within the validated pattern.
     duration=minimum;at=min(at,window-minimum)
    continued=a<begin-1e-8
    if continued:split_count+=1
    # Exact onset groups remain together, tiny deterministic velocity variations only.
    harmonic_density=sum(1 for other in events if abs(other[0]-a)<1e-6)
    phrase=.95+.05*math.sin((a/total)*math.pi)
    velocity=max(.16,min(.88,(.25+.48*v/127)*phrase))
    if not generated and harmonic_density>1:velocity*=1/(harmonic_density**.16)
    if continued:velocity*=.70
    # Articulate without adding gaps to tied/padded continuations.
    duration=max(minimum,duration*(.98 if style=='lofi' else .94 if style=='jazz' else .97))
    pitch=p-60+REGISTER.get(instruments[tr],0)
    assert -24<=pitch<=60,(id,tr,pitch)
    n=dict(at=round(at,6),duration=round(min(duration,window-at),6),pitch=pitch,velocity=round(velocity,4))
    if a+d>total-2*qbar and duration>num*.6:n['toVelocity']=round(velocity*.12,4)
    output.append(n)
   output.sort(key=lambda n:(n['at'],n['pitch']))
   assert len(output)<=128,(id,i,tr,len(output))
   if output:
    emitted+=len(output);parts.append(dict(track=tr,notes=output))
  # Explicit, slow arrangement envelope: no copy/pasted theme/reprise placeholders.
  section='Opening' if i<2 else 'Resolution' if i>=chunks-2 else 'Development'
  scenes.append(dict(name=f'{section} · bars {i*2+1}–{i*2+2}',bars=2,parts=parts))
 assert emitted<=8192,(id,emitted)
 assert len(scenes)<=256 and bars<=512
 rights=dict(
  composition=f"{work['title']} — {work['composer']}; original composition public domain in Germany.",
  arrangement='AI-assisted full-source production; native meter; source voices retained. See library/SOURCES.md for exact scope.',
  recording='Synthesized in jacktools Sound; no external audio recording.',
  license='Source score: Public Domain. Project arrangement/recording: no separate usage license granted.',
  source=page)
 if key=='canon-original':
  rights['arrangement']='Full 4-part score; Michael Fischer v. Mollard, Mutopia 2047 (2015). Synthesized strings/cello; balance and articulation adapted.'
  rights['license']='Score CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ ; no separate license granted for project additions.'
 elif key=='canon':
  rights['arrangement']='Free canon from full violin edition: Jim Paterson / Anonymous, Mutopia 1700 (2009); added voices, ground, coda and new production.'
  rights['license']='Violin source CC BY 3.0: https://creativecommons.org/licenses/by/3.0/ ; no separate license granted for project additions.'
 elif key=='chopin-a':
  rights['composition']='Prélude op.28/7 — Frédéric Chopin (1810–1849); original public domain.'
  rights['arrangement']='Coffeehouse preview; complete PD notation by Magnus Lewis-Smith, Mutopia 470 (Peters). Historical scan comparison pending; see docs.'
 elif key in ('schumann-foreign','brahms-waltz'):
  rights['composition']=f"{work['title']} — {work['composer']}; original public domain."
  rights['arrangement']=('Full AABB, 4 voices; PD helper Ying-Chun Liu, Mutopia 354 (1900 edition). Coffeehouse; historical detail review pending.' if key=='schumann-foreign' else 'Full solo Waltz; PD helper Brian D. Rude, Mutopia 794 (Joseffy). Coffeehouse balance; historical detail review pending.')
 assert all(len(v)<=160 for v in rights.values()),rights
 assert len('\n'.join(rights.values()))<=550,(id,sum(map(len,rights.values())))
 song=dict(format='jacktools-song',version=3,title=f"{work['title']} — {style.title()}",rights=rights,
  meter=dict(numerator=num,denominator=den,groups=[1]*num),tempoUnit=dict(denominator=8 if key=='elise' else 4,dotted=False),
  bpm=bpm,style=style,loop=False,seed=1000+int(hashlib.sha256(id.encode()).hexdigest()[:6],16),
  tracks=[dict(id=tr,instrument=instrument,volume=levels[tr]) for tr,instrument in instruments.items() if timeline[tr]],
  scenes=scenes)
 # A part with no events never exists; make tracks agree after silent bass removal.
 raw=json.dumps(song,ensure_ascii=False,indent=2)+'\n'
 assert len(raw.encode())<=1024*1024,(id,len(raw))
 (OUT/(id+'.song.json')).write_text(raw)
 seconds=total*60/(bpm*(.5 if key=='elise' else 1))
 if key=='canon-original':
  scopes=dict(de='Vollständige Partitur für drei Violinen und Bass, mit originalen Einsätzen und Schluss; keine erfundenen Stimmen oder Coda. Synthetische Interpretation.',en=scope,es='Partitura completa para tres violines y bajo, con entradas y final originales; sin voces ni coda inventadas. Interpretación sintetizada.',fr='Partition complète pour trois violons et basse, entrées et fin originales ; aucune voix ni coda inventée. Interprétation synthétique.')
 elif key=='canon':
  scopes=dict(de='Freie dreistimmige Kanonfassung aus der vollständigen Violinstimme, mit Bass und Coda; keine Original-Gesamtpartitur.',en=scope,es='Canon libre a tres voces de la fuente completa para violín; no es la partitura original completa.',fr='Canon libre à trois voix à partir de la partie complète de violon ; pas la partition originale intégrale.')
 elif key=='ode':
  scopes=dict(de='Vollständiger 16-taktiger Hymnensatz mit Einleitung, Breakdown und Outro; nicht die ganze Sinfonie.',en=scope,es='Arreglo completo del himno de 16 compases, con introducción y final; no la sinfonía completa.',fr='Hymne complet de 16 mesures avec introduction et conclusion ; pas la symphonie entière.')
 elif key=='nacht':
  scopes=dict(de='Vollständiger erster Satz mit vier Streicherstimmen und den Wiederholungen der Quelle.',en=scope,es='Primer movimiento completo con cuatro voces de cuerda y las repeticiones de la fuente.',fr='Premier mouvement complet, quatre parties de cordes et reprises de la source.')
 else:
  scopes=dict(de='Vollständiger Notenverlauf mit allen Stimmen der angegebenen Quelle; gespielte Form und Grenzen in den Quellenhinweisen.',en=scope,es='Secuencia completa de notas y voces de la fuente citada; forma y límites en la documentación.',fr='Séquence complète des notes et parties de la source citée ; forme et limites documentées.')
 entry=dict(id=id,style=style,title=work['title'],composer=work['composer'],path='/library/'+id+'.song.json',
  source=page,originalMeter=f'{num}/{den}',arrangementMeter=f'{num}/{den}',bars=bars,durationSeconds=math.floor(seconds+.5),scope=scope,scopeLabel=scopes)
 transferred=sum(1 for events in timeline.values() for n in events if not n[4])
 assert transferred==original_count*(3 if key=='canon' else 2 if key=='ode' else 1),(id,transferred,original_count)
 REPORT[id]=dict(transferredSourceNotes=transferred,source=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),sourceNotes=original_count,
  outputNotes=emitted,boundaryRearticulations=split_count,bars=bars,durationSeconds=round(seconds,2),scope=scope)
 return entry

def main():
 REPORT.clear() # A prior preview build must not leak extra entries into the stable report.
 manifest=[build(e) for e in ENTRIES]
 (OUT/'catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (OUT/'production-report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+'\n')
 print('\n'.join(f"{id}: {r['bars']} bars, {r['durationSeconds']}s, {r['outputNotes']} notes" for id,r in REPORT.items()))
if __name__=='__main__':main()
