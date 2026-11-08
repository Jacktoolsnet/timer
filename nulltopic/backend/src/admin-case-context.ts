import {withCaseEvidence} from './case-evidence.js';
import {type DB} from './db.js';
import {appealFields} from './appeal-access.js';

/** Load history only for the filtered queue seeds; relationships must be explicit. */
export async function adminCaseContext(db:DB,reports:{id:string}[],appeals:{id:string;moderation_id?:string|null}[]){
  const reportIds=reports.map(r=>r.id),reviewIds=appeals.map(r=>r.id);
  const family=(await db.query(`WITH RECURSIVE family(id) AS (
    SELECT unnest($1::uuid[]) UNION
    SELECT CASE WHEN r.id=f.id THEN r.parent_appeal_id ELSE r.id END
    FROM family f JOIN appeals r ON r.id=f.id OR r.parent_appeal_id=f.id WHERE r.parent_appeal_id IS NOT NULL
  ) SELECT id,moderation_id FROM appeals WHERE id IN(SELECT id FROM family)`,[reviewIds])).rows;
  const decisionIds=family.filter(r=>r.moderation_id!=null).map(r=>String(r.moderation_id));
  const notices=(await db.query(`SELECT m.id,m.case_id,m.report_id,m.action,m.reason,m.created_at,m.agent_id,m.post_id,
    a.name AS agent_name,a.handle AS agent_handle,(a.avatar_base64 IS NOT NULL) AS has_avatar,
    p.body AS post_body,p.state AS post_state,p.conversation_id,p.parent_id
    FROM moderation m LEFT JOIN agents a ON a.id=m.agent_id LEFT JOIN posts p ON p.id=m.post_id
    WHERE m.id=ANY($1::bigint[]) OR m.case_id IN(SELECT case_id FROM moderation WHERE id=ANY($1::bigint[])) OR m.report_id=ANY($2::uuid[]) OR m.report_id IN(SELECT report_id FROM moderation WHERE id=ANY($1::bigint[]))
    ORDER BY m.id`,[decisionIds,reportIds])).rows;
  const allReportIds=[...new Set([...reportIds,...notices.filter(n=>n.report_id).map(n=>n.report_id)])];
  const contextReports=(await db.query(`SELECT r.*,p.body AS post_body,p.state AS post_state,p.conversation_id,p.parent_id,COALESCE(p.agent_id,r.agent_id) AS agent_id,
    a.handle AS agent_handle,a.name AS agent_name,(a.avatar_base64 IS NOT NULL) AS has_avatar
    FROM reports r LEFT JOIN posts p ON p.id=r.post_id LEFT JOIN agents a ON a.id=COALESCE(p.agent_id,r.agent_id)
    WHERE r.id=ANY($1::uuid[]) ORDER BY r.created_at,r.id`,[allReportIds])).rows;
  const contextAppeals=(await db.query(`SELECT ${appealFields},o.handle AS operator_handle,m.action AS original_action
    FROM appeals r LEFT JOIN operators o ON o.id=r.operator_id LEFT JOIN moderation m ON m.id=r.moderation_id
    WHERE r.moderation_id=ANY($1::bigint[]) OR r.id=ANY($2::uuid[]) ORDER BY r.created_at,r.id`,[notices.map(n=>String(n.id)),family.map(r=>r.id)])).rows;
  return {reports:await withCaseEvidence(db,contextReports),notices:await withCaseEvidence(db,notices),appeals:await withCaseEvidence(db,contextAppeals)};
}
