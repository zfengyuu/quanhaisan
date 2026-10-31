"""Generate six tiny original sound cues without dependencies (PCM WAV, 22.05 kHz)."""
import math, wave, struct, random
from pathlib import Path
random.seed(19)
out=Path(__file__).resolve().parent.parent/'public/assets/audio';out.mkdir(parents=True,exist_ok=True)
SR=22050

def synth(name,sec,func):
 data=bytearray()
 for j in range(round(sec*SR)):
  t=j/SR
  v=max(-1,min(1,func(t,j)))*.4
  data+=struct.pack('<h',int(v*32767))
 with wave.open(str(out/f'{name}.wav'),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(data)

synth('click',.10,lambda t,j:math.sin(2*math.pi*(830-330*t/.10)*t)*math.exp(-40*t))
synth('coin',.35,lambda t,j:(math.sin(2*math.pi*720*t)+.5*math.sin(2*math.pi*990*t))*math.exp(-12*t))
synth('catch',.75,lambda t,j:(math.sin(2*math.pi*(430+700*t)*t)+.33*math.sin(2*math.pi*850*t))*math.exp(-3*t))
synth('splash',.65,lambda t,j:(random.random()*2-1)*math.exp(-11*t)*(.65+.35*math.sin(t*42)))
synth('upgrade',.75,lambda t,j:math.sin(2*math.pi*([420,540,660,840][min(3,int(t/.18))])*t)*math.exp(-1.8*t))
synth('chime',.8,lambda t,j:(math.sin(2*math.pi*660*t)+.3*math.sin(2*math.pi*1320*t))*math.exp(-5*t))
print('Audio cues:',len(list(out.glob('*.wav'))))
