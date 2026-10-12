import { alarmTone, alarmTones } from '../lib/alarm-tones';
import { Alarm } from '../lib/alarm';
import { storageAllowed } from '../lib/storage';
import { createFlipClock } from './flip-clock';
const KEY='jacktools.clock.alarm.v1';
export function createAlarm(root: HTMLElement, dialog: HTMLDialogElement, badge: HTMLElement) {
 const t=JSON.parse(root.dataset.text!);
 const time=root.querySelector<HTMLInputElement>('#alarm-time')!, enabled=root.querySelector<HTMLInputElement>('#alarm-enabled')!;
 const volume=root.querySelector<HTMLInputElement>('#alarm-volume')!, vibration=root.querySelector<HTMLInputElement>('#alarm-vibration')!;
 const tone=root.querySelector<HTMLSelectElement>('#alarm-tone')!;
 const status=root.querySelector<HTMLElement>('#alarm-status')!, audioStatus=root.querySelector<HTMLElement>('#alarm-audio-status')!;
 const engine=new Alarm(); let zone='UTC', context:AudioContext|undefined, master:GainNode|undefined;
 const analogIndicator=document.querySelector<SVGElement>('#alarm-analog-indicator')!;
 const readoutIndicator=document.querySelector<HTMLElement>('#alarm-readout-indicator')!;
 let lastAlarmTime=time.value;
 const dialFlips=createFlipClock(document.querySelector<HTMLElement>('#alarm-analog-flips')!);
 const miniFlips=createFlipClock(document.querySelector<HTMLElement>('#alarm-mini-flips')!);
 const oscillators=new Set<OscillatorNode>();
 let pulseTimer:number|undefined, limitTimer:number|undefined, testing=false;
 const canVibrate=typeof navigator.vibrate==='function';
 vibration.disabled=!canVibrate;
 if(!canVibrate)root.querySelector<HTMLElement>('#alarm-vibration-hint')!.textContent=t.unavailable;
 try { if(storageAllowed()) {
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(/^([01]\d|2[0-3]):[0-5]\d$/.test(saved?.time||''))time.value=saved.time;
  if(Number.isInteger(saved?.volume)&&saved.volume>=0&&saved.volume<=100)volume.value=String(saved.volume);
  tone.value=alarmTone(saved?.tone);
  if(canVibrate&&saved?.vibration===true)vibration.checked=true;
 } }catch{}
 const picker=root.querySelector<HTMLElement>('#alarm-time-picker')!, openPicker=root.querySelector<HTMLButtonElement>('#alarm-time-open')!;
 const pickerWrap=root.querySelector<HTMLElement>('.alarm-time-picker-wrap')!;
 const hour=root.querySelector<HTMLSelectElement>('select[name=alarmHour]')!, minute=root.querySelector<HTMLSelectElement>('select[name=alarmMinute]')!;
 function syncPicker(){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.value))return;
  [hour.value,minute.value]=time.value.split(':');
  hour.dispatchEvent(new Event('options-sync'));minute.dispatchEvent(new Event('options-sync'));
 }
 function closePicker(){picker.hidden=true;openPicker.setAttribute('aria-expanded','false');}
 openPicker.addEventListener('click',()=>{
  if(!picker.hidden){closePicker();return;}
  syncPicker();picker.hidden=false;openPicker.setAttribute('aria-expanded','true');
  picker.querySelector<HTMLButtonElement>('.clock-select-trigger')?.focus();
 });
 for(const select of [hour,minute])select.addEventListener('change',()=>{
  time.value=`${hour.value}:${minute.value}`;time.dispatchEvent(new Event('change',{bubbles:true}));
 });
 root.querySelector('#alarm-time-done')!.addEventListener('click',()=>{closePicker();openPicker.focus();});
 pickerWrap.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();closePicker();openPicker.focus();}
 });
 document.addEventListener('click',event=>{if(!pickerWrap.contains(event.target as Node))closePicker();});
 pickerWrap.addEventListener('focusout',event=>{if(!pickerWrap.contains(event.relatedTarget as Node))closePicker();});
 syncPicker();
 function save(){if(!storageAllowed())return;try{localStorage.setItem(KEY,JSON.stringify({time:time.value,volume:Number(volume.value),vibration:vibration.checked,tone:alarmTone(tone.value)}));}catch{status.textContent=t.storageFailed;}}
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
   for(const note of alarmTones[alarmTone(tone.value)]){
    const at=context.currentTime+note.delay,osc=context.createOscillator(),gain=context.createGain();
    osc.type=note.wave;osc.frequency.setValueAtTime(note.frequency,at);
    if(note.endFrequency)osc.frequency.linearRampToValueAtTime(note.endFrequency,at+note.duration-.03);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(note.level,at+.025);gain.gain.exponentialRampToValueAtTime(.001,at+note.duration-.02);
    oscillators.add(osc);osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+note.duration);osc.onended=()=>{oscillators.delete(osc);osc.disconnect();gain.disconnect();};
   }
  }else if(Number(volume.value)>0)audioStatus.textContent=t.soundFailed;
  if(vibration.checked)vibrate([200,100,200,100,400]);
 }
 function signals(test=false){silence();testing=test;pulse();pulseTimer=window.setInterval(pulse,1500);limitTimer=window.setTimeout(()=>{silence();if(engine.ringing){engine.stop();enabled.checked=false;sync();status.textContent=t.stopped;}else sync();},test?3000:120000);}
 function dateText(at:number){return new Intl.DateTimeFormat(document.documentElement.lang,{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(at);}
 function sync(){
  const message=engine.ringing?t.ringing:'';
  status.textContent=testing?t.testing:message;
  badge.textContent=message;badge.hidden=!message;
  const active=engine.due!==null||engine.ringing;
  const view=(document.querySelector<HTMLSelectElement>('select[name=view]')!).value;
  if(engine.due!==null)lastAlarmTime=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).format(engine.due);
  else if(!engine.ringing)lastAlarmTime=time.value;
  const alarmTime=lastAlarmTime;
  const label=`${t.title}: ${alarmTime} · ${zone}`;
  const analog=view==='analog'||view==='combined'||view==='analogFlip';
  analogIndicator.style.display=active&&analog?'':'none';
  analogIndicator.setAttribute('aria-hidden',String(!active||!analog));
  analogIndicator.setAttribute('aria-label',label);
  document.querySelector('#alarm-analog-time')!.textContent=alarmTime;
  document.querySelector<HTMLElement>('#alarm-analog-time')!.hidden=view==='analogFlip';
  document.querySelector<HTMLElement>('#alarm-analog-flips')!.hidden=view!=='analogFlip';
  readoutIndicator.hidden=!active||analog;
  readoutIndicator.setAttribute('aria-label',label);
  const flip=view==='flip'||view==='analogFlip';
  document.querySelector<HTMLElement>('#alarm-readout-time')!.hidden=flip;
  document.querySelector('#alarm-readout-time')!.textContent=alarmTime;
  document.querySelector<HTMLElement>('#alarm-mini-flips')!.hidden=!flip;
  const [h,m]=alarmTime.split(':');miniFlips([{type:'hour',value:h},{type:'minute',value:m}],false);
  dialFlips([{type:'hour',value:h},{type:'minute',value:m}],false);
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
 time.addEventListener('change',()=>{syncPicker();if(enabled.checked){silence();close();arm();}save();});
 volume.addEventListener('input',()=>{volumeUpdate();save();});vibration.addEventListener('change',save);
 tone.addEventListener('change',()=>{save();if(testing){signals(true);sync();}});
 root.querySelector('#alarm-test')!.addEventListener('click',async()=>{await unlock();if(engine.ringing)return;signals(true);sync();});
 dialog.querySelector('#alarm-stop')!.addEventListener('click',stop);
 dialog.querySelector('#alarm-snooze')!.addEventListener('click',()=>{silence();engine.snooze(Date.now());enabled.checked=true;close();sync();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();stop();});
 document.addEventListener('storage-enabled',save);
 document.addEventListener('preferences-cleared',()=>{stop();time.value='07:00';volume.value='50';vibration.checked=false;tone.value='classic';tone.dispatchEvent(new Event('options-sync'));volumeUpdate();syncPicker();closePicker();});
 document.addEventListener('visibilitychange',()=>{tick();});
 window.addEventListener('pagehide',()=>{stop();});
 window.setInterval(tick,1000);volumeUpdate();sync();
 return { configure(nextZone:string){root.querySelector('#alarm-zone')!.textContent=`${t.zone} ${nextZone}`;if(zone===nextZone){sync();return;}zone=nextZone;if(enabled.checked&&!engine.ringing&&!engine.snoozed)arm();else sync();} };
}
