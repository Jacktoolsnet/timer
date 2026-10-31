"""Optional offline demo voice regeneration; requires system libespeak-ng.so.1. No API calls."""
import ctypes as c, array, wave
from pathlib import Path
lib=c.CDLL('libespeak-ng.so.1')
lib.espeak_Initialize.argtypes=[c.c_int,c.c_int,c.c_char_p,c.c_int];lib.espeak_Initialize.restype=c.c_int
rate=lib.espeak_Initialize(2,0,None,0)
CALLBACK=c.CFUNCTYPE(c.c_int,c.POINTER(c.c_short),c.c_int,c.c_void_p)
samples=[]
@CALLBACK
def callback(ptr,n,events):
 if ptr and n:samples.extend(ptr[:n])
 return 0
lib.espeak_SetSynthCallback(callback);lib.espeak_SetVoiceByName(b'en-us+m3')
lib.espeak_SetParameter(1,105,0);lib.espeak_SetParameter(3,16,0);lib.espeak_SetParameter(2,95,0)
lib.espeak_Synth.argtypes=[c.c_char_p,c.c_size_t,c.c_uint,c.c_int,c.c_uint,c.c_uint,c.c_void_p,c.c_void_p]
text=b'Ho! Ho! Ho!'
lib.espeak_Synth(text,len(text)+1,0,1,0,1,None,None);lib.espeak_Synchronize()
# A short, intentionally synthetic theatrical Santa voice; no impersonation or external recording.
# Lower playback rate gives a larger character; a quiet early reflection adds space.
out=[0.]*(len(samples)+int(rate*.18))
for i,v in enumerate(samples):
 out[i]+=v*.84
 if i+int(rate*.075)<len(out):out[i+int(rate*.075)]+=v*.10
pcm=array.array('h',(round(max(-30000,min(30000,v))) for v in out))
with wave.open(str(Path(__file__).resolve().parents[1] / 'public/examples/halloween-night-flight/santa-ho-ho-ho.wav'),'wb') as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(round(rate*.91));f.writeframes(pcm.tobytes())
print('voice',rate,'duration',len(pcm)/round(rate*.91),'seconds')
lib.espeak_Terminate()
