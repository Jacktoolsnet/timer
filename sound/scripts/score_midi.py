"""Small strict Standard MIDI reader for the vendored, score-generated sources.
No audio, synthesizer, MIDI importer in the browser or runtime dependencies.
"""
from collections import defaultdict, deque
import struct

def read_score(path):
 data=path.read_bytes()
 assert data[:4]==b'MThd'
 size,fmt,count,ppq=struct.unpack('>IHHH',data[4:14])
 assert fmt in (0,1) and ppq<32768
 pos=8+size; tracks=[]; meters=[]; tempos=[]; ends=[]
 for index in range(count):
  assert data[pos:pos+4]==b'MTrk'
  length=int.from_bytes(data[pos+4:pos+8],'big'); end=pos+8+length; pos+=8
  tick=0;running=None;active=defaultdict(deque);notes=[];name=''
  def vlq():
   nonlocal pos
   value=0
   for _ in range(4):
    c=data[pos];pos+=1;value=(value<<7)|(c&127)
    if c<128:return value
   raise ValueError('oversized MIDI variable length')
  while pos<end:
   tick+=vlq(); status=data[pos]
   if status>=128:pos+=1
   else:
    assert running is not None
    status=running
   if status==255:
    kind=data[pos];pos+=1;n=vlq();value=data[pos:pos+n];pos+=n
    if kind==3:name=value.decode('utf-8',errors='replace')
    elif kind==0x58:meters.append((tick/ppq,value[0],2**value[1]))
    elif kind==0x51:tempos.append((tick/ppq,60000000/int.from_bytes(value,'big')))
    running=None
   elif status in (240,247):
    n=vlq();pos+=n;running=None
   else:
    running=status;kind=status>>4;channel=status&15
    n=1 if kind in (12,13) else 2
    value=data[pos:pos+n];pos+=n
    if kind==9 and value[1]:
     active[(channel,value[0])].append((tick,value[1]))
    elif kind==8 or kind==9 and value[1]==0:
     key=(channel,value[0])
     if not active[key]:continue # LilyPond can emit duplicate note-offs for merged unisons.
     at,velocity=active[key].popleft()
     if tick>at:notes.append((at/ppq,(tick-at)/ppq,value[0],velocity))
  assert not any(active.values()),path
  ends.append(tick/ppq)
  if notes:tracks.append(dict(name=name,notes=sorted(notes),index=index))
 assert pos==len(data)
 return dict(tracks=tracks,meters=sorted(set(meters)),tempos=sorted(set(tempos)),end=max(ends))
if __name__=='__main__':
 from pathlib import Path
 for p in Path(__file__).with_name('scores').glob('*.mid'):
  s=read_score(p)
  print(p.stem,'meter',s['meters'],'end',s['end'],'tempo',s['tempos'][:4],[(t['name'],len(t['notes']), min(n[2] for n in t['notes']),max(n[2] for n in t['notes']),t['notes'][0][0]) for t in s['tracks']])
