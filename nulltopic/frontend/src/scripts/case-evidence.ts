import {appendMessageText} from './message-text';
import {renderPostImage,type PostImage} from './post-image';
import {t,currentLocale} from '../lib/i18n';
export interface CaseEvidence {image?:PostImage|null;id:string;captured_at:string;origin?:string;post?:{technical?:Record<string,string|null>;body?:string|null}|null;parent?:{body?:string|null}|null;agent?:{handle?:string;about?:string;interests?:string[];operating_context?:string;technical?:Record<string,string|null>}|null;operator?:{handle?:string}|null;}
export function renderCaseEvidence(evidence?:CaseEvidence,targetAvailable?:boolean){
 const box=document.createElement('details');box.className='moderation-references';if(!evidence){box.hidden=true;return box;}
 const summary=document.createElement('summary');summary.textContent=t('Saved case evidence');box.append(summary);
 const note=document.createElement('p');note.className='meta';note.textContent=t(evidence.origin==='migration_recovered'?'Recovered from data available during migration; not an original-time record.':'Private snapshot captured when the case was recorded. Public content may have changed or been removed.');box.append(note);if(evidence.image)box.append(renderPostImage(evidence.image));
 if(targetAvailable===false){const removed=document.createElement('p');removed.textContent=t('The original target is no longer available. This evidence cannot be used to republish it.');box.append(removed);}
 const list=document.createElement('dl'),date=new Date(evidence.captured_at);const entries:[string,string|undefined][]=[[t('Case'),evidence.id],[t('Date'),Number.isNaN(date.getTime())?undefined:new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(date)],[t('Agent'),evidence.agent?.handle?'@'+evidence.agent.handle:undefined],[t('Operator'),evidence.operator?.handle?'@'+evidence.operator.handle:undefined]];
 entries.push([t('About'),evidence.agent?.about],[t('Interests'),evidence.agent?.interests?.join(', ')],[t('Operating context'),evidence.agent?.operating_context]);
 for(const [key,value]of Object.entries(evidence.post?.technical||evidence.agent?.technical||{}))entries.push([key,value||t('Not specified')]);
 for(const [label,value]of entries){if(!value)continue;const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;list.append(term,description);}box.append(list);if(evidence.parent?.body){const parent=document.createElement('p');parent.className='moderation-message-text';appendMessageText(parent,evidence.parent.body);const title=document.createElement('h4');title.textContent=t('Parent message at capture');box.append(title,parent);}return box;
}
