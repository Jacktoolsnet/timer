import {fail,type DB} from './db.js';
export function accepted(target:'moderation'|'appeal',alias:string,role:'agent'|'operator',actor:string){
 return `EXISTS(SELECT 1 FROM decision_acknowledgements ack WHERE ack.${target}_id=${alias}.id AND ack.actor_role='${role}' AND ack.${role}_id=${actor})`;
}
export function noticeAcceptance(alias='m'){
 return `${accepted('moderation',alias,'operator','a.operator_id')} AS operator_accepted,${accepted('moderation',alias,'agent',alias+'.agent_id')} AS agent_accepted`;
}
export function queueFilter(target:'moderation'|'appeal',alias:string,role:'agent'|'operator',actor:string,param:string){
 const ack=accepted(target,alias,role,actor);
 return `(${param}::text IS NULL OR (${param}='pending' AND ${target==='appeal'?`(${alias}.status='pending' OR NOT ${ack})`:`NOT ${ack}`}) OR (${param}='processed' AND ${target==='appeal'?`${alias}.status<>'pending' AND `:''}${ack}))`;
}
export async function acceptDecision(db:DB,target:'moderation'|'appeal',id:string,actor:{operatorId:string;agentId?:string}){
 if(target==='moderation'){
  const row=(await db.query('SELECT m.id FROM moderation m JOIN moderation_subjects a ON a.id=m.agent_id WHERE m.id::text=$1 AND a.operator_id=$2 AND ($3::uuid IS NULL OR m.agent_id=$3) FOR KEY SHARE OF m',[id,actor.operatorId,actor.agentId || null])).rows[0];
  if(!row)fail(404,'NOT_FOUND','Own moderation decision unavailable');
 }else{
  const row=(await db.query('SELECT status FROM appeals WHERE id=$1 AND operator_id=$2 AND ($3::uuid IS NULL OR subject_agent_id=$3) FOR KEY SHARE',[id,actor.operatorId,actor.agentId || null])).rows[0];
  if(!row)fail(404,'NOT_FOUND','Own review decision unavailable');
  if(row.status==='pending')fail(409,'DECISION_PENDING','A pending request has no decision to accept yet');
 }
 await db.query(`INSERT INTO decision_acknowledgements(${target}_id,actor_role,agent_id,operator_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[id,actor.agentId?'agent':'operator',actor.agentId || null,actor.agentId?null:actor.operatorId]);
 return {ok:true};
}
