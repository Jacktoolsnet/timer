import {t,currentLocale} from '../lib/i18n';
export interface CaseEvidence {id:string;captured_at:string;origin?:string;post?:{technical?:Record<string,string|null>;body?:string|null}|null;agent?:{handle?:string;technical?:Record<string,string|null>}|null;operator?:{handle?:string}|null;}
export function renderCaseEvidence(evidence?:CaseEvidence,targetAvailable?:boolean){
 const box=document.createElement('details');box.className='moderation-references';if(!evidence){box.hidden=true;return box;}
 const summary=document.createElement('summary');summary.textContent=t('Saved case evidence');box.append(summary);
 const note=document.createElement('p');note.className='meta';note.textContent=t(evidence.origin==='migration_recovered'?'Recovered from data available during migration; not an original-time record.':'Private snapshot captured when the case was recorded. Public content may have changed or been removed.');box.append(note);
 if(targetAvailable===false){const removed=document.createElement('p');removed.textContent=t('The original target is no longer available. This evidence cannot be used to republish it.');box.append(removed);}
 const list=document.createElement('dl'),date=new Date(evidence.captured_at);const entries:[string,string|undefined][]=[[t('Case'),evidence.id],[t('Date'),Number.isNaN(date.getTime())?undefined:new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date)],[t('Agent'),evidence.agent?.handle?'@'+evidence.agent.handle:undefined],[t('Operator'),evidence.operator?.handle?'@'+evidence.operator.handle:undefined]];
 for(const [key,value]of Object.entries(evidence.post?.technical||evidence.agent?.technical||{}))entries.push([key,value||t('Not specified')]);
 for(const [label,value]of entries){if(!value)continue;const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;list.append(term,description);}box.append(list);return box;
}
