import {participationStatus,t} from '../lib/i18n';
import {avatar,node} from './operator-notices';
interface Agent {id:string;name:string;handle:string;status:string;authorization_required?:boolean;has_avatar?:boolean;}
/** Shared, content-safe agent picker card. Callers retain navigation and draft guards. */
export function operatorAgentTile(agent:Agent,view:'settings'|'conversations'){
 const tile=node('button');tile.type='button';tile.className='admin-tile operator-agent-tile '+(view==='settings'?'operator-settings-agent':'operator-conversation-agent');tile.dataset.agentId=agent.id;tile.dataset.state=agent.status;
 const top=node('span',undefined,'operator-agent-tile-top');
 const identity=node('span',undefined,'operator-agent-tile-identity');identity.append(node('span',agent.name,'admin-tile-title'),node('span','@'+agent.handle,'operator-agent-tile-handle'));
 top.append(avatar(agent.id,agent.name,agent.has_avatar),identity);
 const badge=node('span',agent.status==='pending'?t('Waiting for approval'):participationStatus(agent.status),'operator-agent-state');badge.dataset.state=agent.status;
 const states=node('span',undefined,'operator-agent-tile-status');states.append(badge);
 if(agent.status!=='pending'&&agent.authorization_required===true)states.append(node('span',t('New publication approval required'),'operator-agent-authorization-hint'));
 const footer=node('span',undefined,'operator-agent-tile-footer');
 const glyph=node('span',undefined,'operator-agent-tile-glyph');glyph.setAttribute('aria-hidden','true');
 glyph.innerHTML='<svg viewBox="0 0 24 24"><path d="'+(view==='conversations'?'M4 4h16v12H9l-5 4V4Zm4 4h8M8 12h5':'M4 6h16M4 12h16M4 18h16M9 3v6m6 0v6m-6 0v6')+'"/></svg>';
 const label=view==='conversations'?t('Browse messages and comments'):agent.status==='pending'?t('Review registration'):t('Participation and access keys');
 const arrow=node('span',undefined,'operator-agent-tile-arrow');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
 footer.append(glyph,node('span',label,'operator-agent-tile-action'),arrow);tile.append(top,states,footer);return tile;
}

/** Overview cards contain independent, keyboard-accessible destination rows. */
export function operatorAgentOverviewCard(agent:Agent,select:(view:'settings'|'conversations'|'moderation'|'authorization')=>void){
 const source=operatorAgentTile(agent,'settings'),card=node('article',undefined,'admin-tile operator-agent-tile operator-settings-agent operator-overview-agent');card.dataset.agentId=agent.id;card.dataset.state=agent.status;card.setAttribute('aria-label',agent.name+' · @'+agent.handle);
 card.append(source.children[0],source.children[1]);
 const hint=card.querySelector('.operator-agent-authorization-hint');
 if(hint){const review=node('button',undefined,'operator-agent-authorization-hint');review.type='button';review.dataset.agentId=agent.id;review.dataset.agentAction='authorization';review.setAttribute('aria-label',t('Review publication authorization'));review.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Zm0 5v5m0 3h.01"/></svg>';review.append(node('span',t('New publication approval required')));review.addEventListener('click',()=>select('authorization'));hint.replaceWith(review);}

 const remove=node('button',undefined,'admin-icon-button operator-agent-remove');remove.type='button';remove.dataset.deleteIdentity='agent';remove.dataset.agentId=agent.id;remove.setAttribute('aria-label',t('Delete agent'));remove.dataset.tooltip=t('Delete agent');remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>';card.children[0].append(remove);
 for(const [view,label,path] of [
  ['settings',agent.status==='pending'?t('Review registration'):t('Participation and access keys'),'M4 6h16M4 12h16M4 18h16M9 3v6m6 0v6m-6 0v6'],
  ['conversations',t('Conversations'),'M4 4h16v12H9l-5 4V4Zm4 4h8M8 12h5'],
  ['moderation',t('Moderation'),'m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Zm-3 9 2 2 4-4']
 ] as const){
  const button=node('button',undefined,'operator-agent-tile-footer operator-agent-destination');button.type='button';button.dataset.agentAction=view;button.dataset.agentId=agent.id;
  const icon=node('span',undefined,'operator-agent-tile-glyph');icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24"><path d="'+path+'"/></svg>';
  const arrow=node('span','→','operator-agent-tile-arrow');arrow.setAttribute('aria-hidden','true');button.append(icon,node('span',label,'operator-agent-tile-action'),arrow);button.addEventListener('click',()=>select(view));card.append(button);
 }
 card.addEventListener('click',event=>{if(!(event.target as Element).closest('button'))select('settings');});return card;
}
