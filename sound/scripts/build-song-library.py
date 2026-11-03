"""Rebuild the eleven short, hand-reduced motif arrangements (no network/dependencies).
The existing full Morning Light arrangement is deliberately not regenerated.
Pitch names use C4=0; durations below are already adapted to straight 4/4.
See public/library/SOURCES.md for the exact source editions and limitations.
"""
import json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/library'
PC={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def pitch(s):
 return PC[s[0]]+(1 if '#' in s else -1 if 'b' in s else 0)+12*(int(s[-1])-4)
def bar(s):
 events=[];at=0
 for tok in s.split():
  p,d=tok.split(':');d=float(d)
  if p!='r':events.append((at,d,pitch(p)))
  at+=d
 assert at==4,(s,at)
 return events
# Independent accompaniment/harmony is intentionally simpler than the source scores.
works={
 'nacht':('Eine kleine Nachtmusik','W. A. Mozart (1756–1791)',900,'4/4',[
 'G5:1 r:0.5 D5:0.5 G5:1 r:0.5 D5:0.5','G5:0.5 D5:0.5 G5:0.5 B5:0.5 D6:1 r:1',
 'C6:1 r:0.5 A5:0.5 C6:1 r:0.5 A5:0.5','C6:0.5 A5:0.5 F#5:0.5 A5:0.5 D5:1 r:1',
 'G5:0.5 r:0.5 G5:1.5 B5:0.5 A5:0.5 G5:0.5','F#5:0.5 r:0.5 F#5:1.5 A5:0.5 C6:0.5 F#5:0.5',
 'A5:0.5 G5:0.5 G5:1.5 B5:0.5 A5:0.5 G5:0.5','F#5:0.5 r:0.5 F#5:1 A5:0.5 C6:0.5 G5:1'],['G4','D4','D4','D4','G4','D4','G4','G4']),
 'turca':('Rondo alla turca','W. A. Mozart (1756–1791)',108,'2/4',[
 'B4:0.5 A4:0.5 G#4:0.5 A4:0.5 C5:1 r:1','D5:0.5 C5:0.5 B4:0.5 C5:0.5 E5:1 r:1',
 'F5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 A4:0.5 G#4:0.5 A4:0.5','B4:0.5 A4:0.5 G#4:0.5 A4:0.5 C6:1 A5:0.5 C6:0.5',
 'B5:1 A5:1 G5:1 A5:1','B5:1 A5:1 G5:1 A5:1','B5:1 A5:1 G5:1 F#5:1','E5:3 r:1'],['A4','A4','E4','A4','E4','E4','B4','E4']),
 'ode':('Ode an die Freude','L. van Beethoven (1770–1827)',None,'4/4',[
 'E5:1 E5:1 F5:1 G5:1','G5:1 F5:1 E5:1 D5:1','C5:1 C5:1 D5:1 E5:1','E5:1.5 D5:0.5 D5:2',
 'E5:1 E5:1 F5:1 G5:1','G5:1 F5:1 E5:1 D5:1','C5:1 C5:1 D5:1 E5:1','D5:1.5 C5:0.5 C5:2'],['C4','G4','C4','G4','C4','G4','C4','C4']),
 'elise':('Für Elise','L. van Beethoven (1770–1827)',931,'3/8',[
 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5','A4:2 r:0.5 C4:0.5 E4:0.5 A4:0.5',
 'B4:2 r:0.5 E4:0.5 G#4:0.5 B4:0.5','C5:2 r:0.5 E4:0.5 E5:0.5 D#5:0.5',
 'E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1','C4:1 E4:1 A4:1 B4:1',
 'E4:1 C5:1 B4:1 A4:1','A4:3 r:1'],['A4','A4','E4','A4','A4','A4','E4','A4']),
 'entertainer':('The Entertainer','Scott Joplin (1868–1917)',263,'2/4',[
 'E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:0.5','C5:2.5 C6:0.5 D6:0.5 D#6:0.5',
 'E6:0.5 C6:0.5 D6:0.5 E6:1 B5:0.5 D6:1','C6:3 D4:0.5 D#4:0.5',
 'E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:0.5','C5:3 A5:0.5 G5:0.5',
 'F#5:0.5 A5:0.5 C6:0.5 E6:1 D6:0.5 C6:0.5 A5:0.5','D6:3 r:1'],['C4','C4','G4','C4','C4','F4','D4','G4']),
 'maple':('Maple Leaf Rag','Scott Joplin (1868–1917)',23,'2/4',[
 'r:0.5 Ab4:0.5 Eb5:0.5 Ab4:0.5 C5:0.5 Eb5:1 G4:0.5','Eb5:0.5 G4:0.5 Bb4:0.5 Eb5:2.5',
 'r:0.5 Ab4:0.5 Eb5:0.5 Ab4:0.5 C5:0.5 Eb5:1 G4:0.5','Eb5:0.5 G4:0.5 Bb4:0.5 Eb5:1.5 r:0.5 Eb5:0.5',
 'r:0.5 Ab4:0.5 B4:0.5 E5:0.5 r:0.5 Eb5:0.5 r:0.5 Eb5:0.5','r:0.5 Ab4:0.5 B4:0.5 E5:0.5 r:0.5 Eb5:0.5 r:1',
 'r:0.5 Ab3:0.5 B3:0.5 Ab4:0.5 r:0.5 Ab4:0.5 B4:0.5 Ab5:0.5','r:0.5 Ab4:0.5 B4:0.5 Ab5:0.5 r:0.5 Ab4:0.5 B4:0.5 Ab5:0.5'],['Ab4','Eb4','Ab4','Eb4','Ab4','Ab4','Ab4','Ab4']),
 'winners':('The Easy Winners','Scott Joplin (1868–1917)',352,'2/4',[
 'C5:1 C5:2 Eb5:1','F5:0.5 Eb5:1 F5:0.5 Eb5:0.5 F5:0.5 Eb5:1',
 'Bb5:0.5 Ab5:1 Bb5:0.5 Ab5:0.5 Bb5:0.5 Ab5:0.5 Eb5:0.5','Eb5:4',
 'C5:1 C5:2 Eb5:1','F5:0.5 Eb5:1 F5:0.5 Eb5:0.5 Eb5:0.5 Eb5:1',
 'r:0.5 G4:1.5 Ab4:1 Ab4:1','Eb5:2.5 Eb4:0.5 G4:0.5 Db5:0.5'],['Ab4','Ab4','Db4','Ab4','Ab4','Ab4','Eb4','Eb4']),
 'gymno':('Gymnopédie No. 1','Erik Satie (1866–1925)',37,'3/4',[
 'r:2 F#4:1 A4:1','G4:1 F#4:1 C#4:2','B3:1 C#4:1 D4:2','A3:4',
 'F#3:4','F#3:4','F#3:4','F#3:4'],['G4','D4','G4','D4','G4','D4','G4','D4']),
 'traum':('Träumerei','Robert Schumann (1810–1856)',504,'4/4',[
 'F4:2.5 E4:0.5 F4:0.5 A4:0.5','C5:0.5 F5:0.5 F5:2 E5:0.5 D5:0.5',
 'C5:0.5 F5:0.5 G4:0.5 A4:0.5 Bb4:0.5 D5:0.5 F4:0.5 G4:0.5','A4:0.5 C5:0.5 G4:2 C4:1',
 'F4:2.5 E4:0.5 F4:0.5 A4:0.5','C5:0.5 A5:0.5 A5:1.5 G5:0.5 F5:0.5 E5:0.5',
 'F5:0.5 A5:0.5 D5:0.5 F5:0.5 E5:1.5 Eb5:0.5','D5:1 E5:1 C5:1 r:1'],['F4','Bb4','G4','C4','F4','F4','Bb4','C4']),
 'prelude':('Prélude e-Moll op. 28 Nr. 4','Frédéric Chopin (1810–1849)',468,'2/2',[
 'B4:3 C5:1','B4:3 C5:1','B4:3 C5:1','B4:3 Bb4:1','A4:3 B4:1','A4:3 B4:1','A4:3 B4:0.75 A4:0.25','A4:3 G#4:1'],['E4','E4','E4','E4','A4','A4','A4','E4']),
 'canon':('Canon in D','Johann Pachelbel (1653–1706)',None,'4/4',[
 'F#5:2 E5:2','D5:2 C#5:2','B4:2 A4:2','B4:2 C#5:2',
 'D5:2 C#5:2','B4:2 A4:2','G4:2 F#4:2','G4:2 E4:2'],['D4','B3','G3','G3','D4','B3','G3','G3'])}
# IDs, style and BPM intentionally explicit: choosing a work never randomizes it.
entries=[('classical-nachtmusik','nacht','classical',108),('classical-turca','turca','classical',100),('house-canon','canon','house',122),('house-ode','ode','house',124),('house-elise','elise','house',120),('jazz-entertainer','entertainer','jazz',94),('jazz-maple-leaf','maple','jazz',96),('jazz-easy-winners','winners','jazz',92),('lofi-gymnopedie','gymno','lofi',72),('lofi-traeumerei','traum','lofi',70),('lofi-prelude','prelude','lofi',68)]
def note(at,d,p,v=.64):return dict(at=at,duration=round(d*.94,4),pitch=p,velocity=v)
def generate(id,key,style,bpm):
 title,composer,ref,meter,bars,roots=works[key]
 source=f'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={ref}' if ref else ('https://imslp.org/wiki/Canon_and_Gigue_in_D_major_(Pachelbel,_Johann)' if key=='canon' else 'https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)')
 minor=key in ('elise','turca','prelude')
 tracks=[dict(id='lead',instrument={'house':'pluck','jazz':'piano','lofi':'epiano','classical':'piano'}[style],volume=.43),dict(id='harmony',instrument='pad' if style=='lofi' else 'piano',volume=.16),dict(id='bass',instrument='doublebass' if style=='jazz' else 'bass',volume=.23)]
 if style!='classical':tracks += [dict(id='kick',instrument='kick',volume=.24),dict(id='snare',instrument='rim' if style=='lofi' else 'snare',volume=.12),dict(id='hat',instrument='hat',volume=.08)]
 scenes=[]
 for section,volume in [('Theme',.82),('Reprise',1)]:
  for pair in range(4):
   lead=[];harmony=[];bass=[]
   for b in range(2):
    idx=pair*2+b;root=pitch(roots[idx]);chord=[root,root+(3 if minor else 4),root+7]
    lead += [note(b*4+at,d,p+ (12 if style=='lofi' and key=='gymno' else 0),.62 if section=='Theme' else .69) for at,d,p in bar(bars[idx])]
    if style=='house':
     harmony += [note(b*4+at,.4,chord,.48) for at in [.5,1.5,2.5,3.5]]
    elif style=='jazz':harmony += [note(b*4+at,.65,chord,.46) for at in [1,3]]
    else:harmony += [note(b*4,3.8,chord,.46)]
    bass += [note(b*4+at,.8,root-12,.58) for at in ([0,2] if style!='house' else [0,1,2,3])]
    if key=='canon':
     # Preserve the characteristic eight-chord ground, two beats per chord.
     ground=['D4','A3','B3','F#3','G3','D4','G3','A3']
     harmony=[n for n in harmony if n['at']<b*4]
     bass=[n for n in bass if n['at']<b*4]
     for half in range(2):
      r=pitch(ground[(idx*2+half)%8]);c=[r,r+(3 if r%12 in (11,6) else 4),r+7]
      harmony += [note(b*4+half*2+a,.4,c,.48) for a in [.5,1.5]]
      bass += [note(b*4+half*2+a,.8,r-12,.58) for a in [0,1]]
   parts=[dict(track=t,volume=volume,notes=n) for t,n in [('lead',lead),('harmony',harmony),('bass',bass)]]
   if style!='classical':
    for t,ats in [('kick',range(8) if style=='house' else [0,2.5,4,6.5]),('snare',[1,3,5,7]),('hat',[i*.5 for i in range(16)])]:parts.append(dict(track=t,volume=volume,notes=[note(at,.12,0,.48) for at in ats]))
   scenes.append(dict(name=f'{section} {pair+1} · 4/4',bars=2,variation=.012,parts=parts))
 root=pitch(roots[0]);chord=[root,root+(3 if minor else 4),root+7]
 scenes.append(dict(name='Coda',bars=2,parts=[dict(track='lead',notes=[dict(note(0,7,root+12,.45),toVelocity=0)]),dict(track='harmony',notes=[dict(note(0,7,chord,.4),toVelocity=0)]),dict(track='bass',notes=[dict(note(0,7,root-12,.45),toVelocity=0)])]))
 rights=dict(composition=f'{title} — {composer}; original composition public domain in Germany.',arrangement=f'jacktools AI-assisted motif study; simplified accompaniment; {meter} source adapted to 4/4.',recording='Synthesized by jacktools Sound; no external audio recording or samples used.',license='Arrangement/recording: no separate usage license granted; rights not conclusively reviewed.',source=source)
 assert all(len(s)<=160 for s in rights.values())
 assert len('\n'.join(rights.values()))<=550
 song=dict(format='jacktools-song',version=2,title=f'{title} — {style.title()} · motif study (4/4)',rights=rights,bpm=bpm,style=style,loop=False,seed=1706+len(id),tracks=tracks,scenes=scenes)
 (OUT/(id+'.song.json')).write_text(json.dumps(song,ensure_ascii=False,indent=2)+'\n')
 return dict(id=id,style=style,title=title,composer=composer,path='/library/'+id+'.song.json',source=source,originalMeter=meter)
manifest=[dict(id='classical-canon',style='classical',title='Canon in D — Morning Light',composer='Johann Pachelbel (1653–1706)',path='/examples/pachelbel-canon-morning-light.song.json',source='https://imslp.org/wiki/Canon_and_Gigue_in_D_major_(Pachelbel,_Johann)',originalMeter='4/4')]
manifest += [generate(*e) for e in entries]
(OUT/'catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Generated {len(entries)} motif studies and catalog ({len(manifest)} entries).')
