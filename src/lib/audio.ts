/** Optional locally synthesized audio; no external provider or background audio. */
export type SoundCue='coin'|'catch'|'splash'|'upgrade'|'click'|'chime';
export function playSound(sound:SoundCue){
 if(typeof window==='undefined')return;
 try{
  if(window.localStorage.getItem('qhs-sound-off')==='1')return;
  const a=new Audio(`/assets/audio/${sound}.wav`);a.volume=.25;
  void a.play().catch(()=>{});
 }catch{}
}
