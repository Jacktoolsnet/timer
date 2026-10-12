import { Alarm } from '../lib/alarm';
import { storageAllowed } from '../lib/storage';
const KEY='jacktools.clock.alarm.v1';
export function createAlarm(root: HTMLElement, dialog: HTMLDialogElement, badge: HTMLElement) {
 const t=JSON.parse(root.dataset.text!);
 const time=root.querySelector<HTMLInputElement>('#alarm-time')!, enabled=root.querySelector<HTMLInputElement>('#alarm-enabled')!;
 const volume=root.querySelector<HTMLInputElement>('#alarm-volume')!, vibration=root.querySelector<HTMLInputElement>('#alarm-vibration')!;
 const status=root.querySelector<HTMLElement>('#alarm-status')!, audioStatus=root.querySelector<HTMLElement>('#alarm-audio-status')!;
 const engine=new Alarm(); let zone='UTC', context:AudioContext|undefined, master:GainNode|undefined;
 const oscillators=new Set<OscillatorNode>();
 let pulseTimer:number|undefined, limitTimer:number|undefined, testing=false;
 const canVibrate=typeof navigator.vibrate==='function';
 vibration.disabled=!canVibrate;
 if(!canVibrate)root.querySelector<HTMLElement>('#alarm-vibration-hint')!.textContent=t.unavailable;
 try { if(storageAllowed()) {
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(/^([01]\d|2[0-3]):[0-5]\d$/.test(saved?.time||''))time.value=saved.time;
  if(Number.isInteger(saved?.volume)&&saved.volume>=0&&saved.volume<=100)volume.value=String(saved.volume);
  if(canVibrate&&saved?.vibration===true)vibration.checked=true;
 } }catch{}
 function save(){if(!storageAllowed())return;try{localStorage.setItem(KEY,JSON.stringify({time:time.value,volume:Number(volume.value),vibration:vibration.checked}));}catch{status.textContent=t.storageFailed;}}
 function volumeUpdate(){root.querySelector('#alarm-volume-value')!.textContent=`${volume.value} %`;if(master&&context)master.gain.setTargetAtTime(Number(volume.value)/100*.16,context.currentTime,.02);}
 async function unlock(){
  try {
   if(!context){context=new AudioContext();master=context.createGain();volumeUpdate();master!.connect(context.destination);}
   if(context.state!=='running')await context.resume();
   audioStatus.textContent=context.state==='running'?'':t.soundFailed;
  }catch{audioStatus.textContent=t.soundFailed;}
 }
 function vibrate(pattern:number|number[]){if(canVibrate)try{navigator.vibrate(pattern);}catch{}}
 function silence(){
  if(pulseTimer!==undefined)clearInterval(pulseTimer);if(limitTimer!==undefined)clearTimeout(limitTimer);
  pulseTimer=limitTimer=undefined;testing=false;vibrate(0);
  oscillators.forEach(osc=>{try{osc.stop();}catch{}});oscillators.clear();
  if(master&&context)master.gain.setValueAtTime(0,context.currentTime);
 }
 function pulse(){
  if(context?.state==='running'&&master&&Number(volume.value)>0){
   volumeUpdate();
   for(const delay of [0,.3,.6]){
    const at=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
    osc.type='sine';osc.frequency.value=delay===.3?880:660;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.65,at+.02);gain.gain.exponentialRampToValueAtTime(.001,at+.22);
    oscillators.add(osc);osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+.25);osc.onended=()=>{oscillators.delete(osc);osc.disconnect();gain.disconnect();};
   }
  }else if(Number(volume.value)>0)audioStatus.textContent=t.soundFailed;
  if(vibration.checked)vibrate([200,100,200,100,400]);
 }
 function signals(test=false){silence();testing=test;pulse();pulseTimer=window.setInterval(pulse,1500);limitTimer=window.setTimeout(()=>{silence();if(engine.ringing){engine.stop();enabled.checked=false;sync();status.textContent=t.stopped;}else sync();},test?3000:120000);}
 function dateText(at:number){return new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(at);}
 function sync(){
  const message=engine.ringing?t.ringing:engine.due!==null?`${engine.snoozed?t.snoozed:t.scheduled} ${dateText(engine.due)} · ${zone}`:t.off;
  status.textContent=testing?t.testing:message;
  badge.textContent=message;badge.hidden=engine.due===null&&!engine.ringing;
 }
 function close(){if(dialog.open)dialog.close();}
 function stop(){engine.stop();enabled.checked=false;silence();close();sync();}
 function ring(){
  signals();sync();document.body.classList.remove('focus-cursor-hidden');
  dialog.querySelector('#alarm-dialog-time')!.textContent=`${dateText(Date.now())} · ${zone}`;
  dialog.querySelector('#alarm-dialog-audio')!.textContent=audioStatus.textContent;
  if(!dialog.open)dialog.showModal();
 }
 function tick(){const result=engine.check(Date.now());if(result==='ring')ring();else if(result==='missed'){enabled.checked=false;silence();sync();status.textContent=t.missed;badge.textContent=t.missed;badge.hidden=false;}}
 function arm(){try{engine.arm(Date.now(),time.value,zone);sync();}catch{stop();status.textContent=t.invalid;}}
 enabled.addEventListener('change',()=>{if(enabled.checked){silence();close();arm();void unlock();}else stop();});
 time.addEventListener('change',()=>{if(enabled.checked){silence();close();arm();}save();});
 volume.addEventListener('input',()=>{volumeUpdate();save();});vibration.addEventListener('change',save);
 root.querySelector('#alarm-test')!.addEventListener('click',async()=>{await unlock();if(engine.ringing)return;signals(true);sync();});
 dialog.querySelector('#alarm-stop')!.addEventListener('click',stop);
 dialog.querySelector('#alarm-snooze')!.addEventListener('click',()=>{silence();engine.snooze(Date.now());enabled.checked=true;close();sync();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();stop();});
 document.addEventListener('storage-enabled',save);
 document.addEventListener('preferences-cleared',()=>{stop();time.value='07:00';volume.value='50';vibration.checked=false;volumeUpdate();});
 document.addEventListener('visibilitychange',()=>{tick();});
 window.addEventListener('pagehide',()=>{stop();});
 window.setInterval(tick,1000);volumeUpdate();sync();
 return { configure(nextZone:string){root.querySelector('#alarm-zone')!.textContent=`${t.zone} ${nextZone}`;if(zone===nextZone)return;zone=nextZone;if(enabled.checked&&!engine.ringing&&!engine.snoozed)arm();else sync();} };
}
