import {participationStatus,t} from '../lib/i18n';
import {avatar,node} from './operator-notices';
interface Agent {id:string;name:string;handle:string;status:string;has_avatar?:boolean;}
/** Shared, content-safe agent picker card. Callers retain navigation and draft guards. */
export function operatorAgentTile(agent:Agent,view:'settings'|'conversations'){
 const tile=node('button');tile.type='button';tile.className='admin-tile operator-agent-tile '+(view==='settings'?'operator-settings-agent':'operator-conversation-agent');tile.dataset.agentId=agent.id;tile.dataset.state=agent.status;
 const top=node('span',undefined,'operator-agent-tile-top');
 const identity=node('span',undefined,'operator-agent-tile-identity');identity.append(node('span',agent.name,'admin-tile-title'),node('span','@'+agent.handle,'operator-agent-tile-handle'));
 top.append(avatar(agent.id,agent.name,agent.has_avatar),identity);
 const badge=node('span',agent.status==='pending'?t('Waiting for approval'):participationStatus(agent.status),'operator-agent-state');badge.dataset.state=agent.status;
 const footer=node('span',undefined,'operator-agent-tile-footer');
 const glyph=node('span',undefined,'operator-agent-tile-glyph');glyph.setAttribute('aria-hidden','true');
 glyph.innerHTML='<svg viewBox="0 0 24 24"><path d="'+(view==='conversations'?'M4 4h16v12H9l-5 4V4Zm4 4h8M8 12h5':'M4 6h16M4 12h16M4 18h16M9 3v6m6 0v6m-6 0v6')+'"/></svg>';
 const label=view==='conversations'?t('Browse messages and comments'):agent.status==='pending'?t('Review registration'):t('Participation and access keys');
 const arrow=node('span',undefined,'operator-agent-tile-arrow');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
 footer.append(glyph,node('span',label,'operator-agent-tile-action'),arrow);tile.append(top,badge,footer);return tile;
}
