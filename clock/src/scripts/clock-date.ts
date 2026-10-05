import {createFlipClock} from './flip-clock';
export function createClockDate(root: HTMLElement) {
  root.innerHTML = '<p class="date-weekday"></p><div class="date-calendar"><span class="date-month"></span><strong class="date-day"></strong><span class="date-footer"></span></div><p class="date-elegant"></p><div class="date-flaps" aria-hidden="true"></div><p class="date-flap-caption"></p>';
  const get=(selector:string)=>root.querySelector<HTMLElement>(selector)!;
  const flip=createFlipClock(get('.date-flaps'));
  let previous='',formatter:Intl.DateTimeFormat;
  let locale='en',zone='UTC';
  return {
    configure(language:string,timeZone:string,style:string) {
      locale=language;zone=timeZone;root.dataset.style=style;previous='';
      formatter=new Intl.DateTimeFormat(locale,{timeZone:zone,weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    },
    render(now:Date) {
      const pieces=formatter.formatToParts(now),p=Object.fromEntries(pieces.map(x=>[x.type,x.value]));
      const key=`${p.year}-${p.month}-${p.day}`;
      if(key===previous)return;
      const animate=previous!=='';previous=key;
      root.setAttribute('aria-label',formatter.format(now));
      // The equivalent full date is the accessible label; decorative parts are hidden.
      root.setAttribute('role','img');
      for(const child of root.children)child.setAttribute('aria-hidden','true');
      get('.date-weekday').textContent=p.weekday;
      get('.date-month').textContent=p.month;
      get('.date-day').textContent=p.day;
      get('.date-footer').textContent=`${p.weekday} · ${p.year}`;
      get('.date-elegant').textContent=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'numeric',month:'long',year:'numeric'}).format(now);
      const numeric=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'2-digit',month:'2-digit'}).formatToParts(now);
      flip(numeric.filter(x=>x.type==='day'||x.type==='month').map((x,i)=>({type:i===0?'hour':'minute',value:x.value} as Intl.DateTimeFormatPart)),animate);
      get('.date-flap-caption').textContent=formatter.format(now);
    }
  };
}
