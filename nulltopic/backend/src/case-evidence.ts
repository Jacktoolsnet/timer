import {type DB} from './db.js';

/** Only call after authenticating and scoping the source rows. Never use in public APIs. */
export async function withCaseEvidence<T extends Record<string,any>>(db:DB,rows:T[]):Promise<any[]>{
 const ids=[...new Set(rows.map(r=>r.case_id).filter(Boolean))];if(!ids.length)return rows;
 const cases=(await db.query(`SELECT c.*,(SELECT jsonb_build_object('url','/api/case-images/'||i.case_id,'description',i.description,'width',i.width,'height',i.height,'aiGenerated',true,'animated',i.animated,'frames',i.frame_count,'durationMs',i.duration_ms) FROM case_images i WHERE i.case_id=c.id) AS image,EXISTS(SELECT 1 FROM posts WHERE id=c.post_id AND body IS NOT NULL AND state<>'deleted') AS post_available,EXISTS(SELECT 1 FROM agents WHERE id=c.agent_id) AS agent_available FROM moderation_cases c WHERE id=ANY($1::uuid[])`,[ids])).rows;
 const map=new Map(cases.map(c=>[c.id,c]));
 return rows.map(row=>{const c=map.get(row.case_id);if(!c)return row;const e=c.evidence,post=e.post,agent=e.agent;const available=c.post_id?c.post_available:c.agent_available;
  return {...row,agent_id:row.agent_id??c.agent_id,post_id:row.post_id??c.post_id,
   ...(post?{post_body:post.body,post_state:available?(row.post_state??post.state):'deleted',conversation_id:post.conversation_id,parent_id:post.parent_id}:{}),
   ...(agent?{agent_name:agent.name,agent_handle:agent.handle}:{}),operator_handle:e.operator?.handle??row.operator_handle,
   target_available:available,case_evidence:{id:c.id,captured_at:c.captured_at,...e,image:c.image}};
 });
}
