import {accepted} from "./decision-acknowledgements.js";
import {fail,type DB} from './db.js';
// Only safe scoped case metadata; no password/key/session columns.
export const appealFields=`r.id,r.operator_id,r.subject_agent_id,r.moderation_id,r.reason,r.created_at,r.status,r.response,r.decided_at,r.correction,r.submitted_by,r.submitted_agent_id,r.parent_appeal_id,r.revision,${accepted('appeal','r','operator','r.operator_id')} AS operator_accepted,${accepted('appeal','r','agent','r.subject_agent_id')} AS agent_accepted,
 (SELECT handle FROM agents WHERE id=r.subject_agent_id) AS agent_handle,
 (SELECT response FROM appeals WHERE id=r.parent_appeal_id AND operator_id=r.operator_id) AS previous_response,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',msg.id,'author_role',msg.author_role,'body',msg.body,'created_at',msg.created_at,'handle',CASE WHEN msg.author_role='agent' THEN ag.handle ELSE op.handle END) ORDER BY msg.id)
 FROM appeal_messages msg LEFT JOIN agents ag ON ag.id=msg.agent_id LEFT JOIN operators op ON op.id=msg.operator_id WHERE msg.appeal_id=r.id),'[]'::jsonb) AS messages`;
export async function addAppealMessage(db:DB,id:string,body:string,actor:{operatorId:string;agentId?:string}){
 // Protect the original FK before locking its appeal, matching cleanup's
 // moderation -> appeal-FK order when a closed case creates a follow-up.
 const reference=(await db.query("SELECT moderation_id,subject_agent_id FROM appeals WHERE id=$1 AND operator_id=$2 AND ($3::uuid IS NULL OR subject_agent_id=$3)",[id,actor.operatorId,actor.agentId || null])).rows[0];
 if(reference?.subject_agent_id)await db.query('SELECT id FROM agents WHERE id=$1 FOR KEY SHARE',[reference.subject_agent_id]);
 if(reference?.moderation_id)await db.query('SELECT id FROM moderation WHERE id=$1 FOR KEY SHARE',[reference.moderation_id]);
 const appeal=(await db.query("SELECT * FROM appeals WHERE id=$1 AND operator_id=$2 AND ($3::uuid IS NULL OR subject_agent_id=$3) FOR UPDATE",[id,actor.operatorId,actor.agentId || null])).rows[0];
 if(!appeal)fail(404,'NOT_FOUND','Owned review request unavailable');
 if(appeal.status!=='pending'){
  // Never overwrite an adjudicated response/correction. A reply starts a linked
  // pending follow-up, which the administrator can decide separately.
  const created=(await db.query("INSERT INTO appeals(id,operator_id,subject_agent_id,moderation_id,reason,submitted_by,submitted_agent_id,parent_appeal_id) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7) RETURNING id",[actor.operatorId,appeal.subject_agent_id,appeal.moderation_id,body,actor.agentId?'agent':'operator',actor.agentId || null,id])).rows[0];
  return {reviewId:created.id,followUp:true};
 }
 if((await db.query('SELECT count(*)::int AS count FROM appeal_messages WHERE appeal_id=$1',[id])).rows[0].count>=50)fail(409,'CONTEXT_LIMIT','This pending request already has 50 additions. Please wait for its decision');
 await db.query('INSERT INTO appeal_messages(appeal_id,author_role,operator_id,agent_id,body) VALUES($1,$2,$3,$4,$5)',[id,actor.agentId?'agent':'operator',actor.agentId?null:actor.operatorId,actor.agentId || null,body]);
 await db.query('UPDATE appeals SET revision=revision+1 WHERE id=$1',[id]);
 return {reviewId:id,followUp:false};
}
