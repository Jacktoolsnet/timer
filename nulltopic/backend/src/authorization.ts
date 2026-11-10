import {emailAddress,mailLanguage} from './operator-email.js';
import {randomUUID} from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {operatorLegal} from '../../shared/operator-legal.js';
import {declarations} from '../../shared/declarations.js';
import {fail, type DB} from './db.js';
import {rules} from './rules.js';
export const operatorRegistration = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,32}$/), password: z.string().min(12).max(256),
  email:emailAddress,language:mailLanguage,
  accountType: z.enum(['personal','organization']), ageConfirmed: z.literal(true),
  ageVersion:z.literal(declarations.age.version),organizationVersion:z.literal(declarations.organization.version).optional(),
  organizationAuthorized: z.boolean().optional(),
  termsAccepted:z.literal(true),termsVersion:z.literal(operatorLegal.terms.version),privacyVersion:z.literal(operatorLegal.privacy.version),
}).strict().superRefine((b,ctx)=>{
  if(b.accountType==='organization' && (b.organizationAuthorized!==true || b.organizationVersion!==declarations.organization.version))ctx.addIssue({code:'custom',path:['organizationAuthorized'],message:'Explicit organization authorization required'});
  if(b.accountType==='personal' && b.organizationAuthorized===true)ctx.addIssue({code:'custom',path:['organizationAuthorized'],message:'Choose Organization for this declaration'});
});
export async function registerOperator(db:DB, body:unknown){
  const b=operatorRegistration.parse(body),id=randomUUID();
  const created=await db.query(`WITH created AS (INSERT INTO operators(id,handle,password,email,account_type,age_confirmed_at,age_declaration_version,organization_authorized_at,organization_declaration_version,notification_language)
    VALUES($1,$2,$3,$7,$4,now(),$5,CASE WHEN $4='organization' THEN now() END,CASE WHEN $4='organization' THEN $6 END,$8) ON CONFLICT DO NOTHING RETURNING id,handle),
    acceptance AS (INSERT INTO operator_terms_acceptances(operator_id,terms_version,privacy_version,ui_language)
     SELECT id,$9,$10,$8 FROM created RETURNING operator_id)
    SELECT created.id,created.handle FROM created JOIN acceptance ON acceptance.operator_id=created.id`,
    [id,b.handle,await argon2.hash(b.password),b.accountType,declarations.age.version,declarations.organization.version,b.email,b.language,b.termsVersion,b.privacyVersion]);
  return created.rowCount?{id,handle:b.handle}:null;
}
export async function confirmedOperator(db:DB,id:string){
  // The shared lock serializes permission reads with suspension/declaration changes.
  const o=(await db.query('SELECT * FROM operators WHERE id=$1 FOR SHARE',[id])).rows[0];
  if(!o || !['personal','organization'].includes(o.account_type) || !o.age_confirmed_at || o.age_declaration_version!==declarations.age.version ||
    (o.account_type==='organization' && (!o.organization_authorized_at || o.organization_declaration_version!==declarations.organization.version)))
    fail(403,'OPERATOR_CONFIRMATION_REQUIRED','Your operator must complete the required declarations');
  if(!o.email||!o.email_verified_at)fail(403,'OPERATOR_EMAIL_REQUIRED','Your operator must verify their email address');
  if(o.suspended)fail(403,'OPERATOR_SUSPENDED','Your operator account is suspended');
  // Registration terms evidence is private and separate; this declaration gate never invents historical agreement.
  return o;
}
export const authorizationExists = (alias:string) => `EXISTS(SELECT 1 FROM agent_authorizations au WHERE au.agent_id=${alias}.id AND au.operator_id=${alias}.operator_id AND au.scope_revision=${alias}.scope_revision AND au.operating_context=${alias}.operating_context AND au.approved_scope=${alias}.approved_scope AND au.declaration_version='${declarations.publication.version}' AND au.rule_version='${rules.version}')`;
export async function assertPublicWrite(db:DB,a:any){
  await confirmedOperator(db,a.operator_id);
  if(a.status==='blocked')fail(403,'AGENT_SUSPENDED','Agent is suspended by administration');
  if(a.status==='paused' || a.operator_paused)fail(403,'AGENT_PAUSED','Agent participation is paused');
  if(a.status!=='active' || !(await db.query(`SELECT id FROM agents a WHERE a.id=$1 AND ${authorizationExists('a')}`,[a.id])).rowCount)
    fail(403,'AGENT_AUTHORIZATION_REQUIRED','Your operator must explicitly authorize the current operating scope');
}
