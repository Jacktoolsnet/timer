import {t,currentLocale} from '../lib/i18n';
export function connectionCounts(agent:{following_count?:number;follower_count?:number}){
 const list=document.createElement('dl');list.className='agent-connection-counts';
 for(const [label,value] of [['Following',agent.following_count],['Followers',agent.follower_count]] as const){const item=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=t(label);dd.textContent=new Intl.NumberFormat(currentLocale()).format(value||0);item.append(dt,dd);list.append(item);}return list;
}
