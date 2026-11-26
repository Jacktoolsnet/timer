import express,{type ErrorRequestHandler,type RequestHandler} from 'express';
import helmet from 'helmet';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {Config} from './config.js';
import {Database,BusyError} from './database.js';
import {hashPassword,verifyPassword,token,digest,equal} from './security.js';
import {ApiError,object,text,username,password,email,id,publicUser,auth,type UserRow} from './http.js';

export async function createApp(config:Config,db:Database){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 app.use(helmet());
 const cookieName=config.production?'__Host-jt_admin':'jt_admin_dev';
 const cookieOptions={httpOnly:true,secure:config.production,sameSite:'lax' as const,path:'/'};
 const clearCookie=(res:express.Response)=>res.clearCookie(cookieName,cookieOptions);
 const dummy=await hashPassword(token());
 app.use((req,res,next)=>{
  res.locals.requestId=randomUUID();res.set('X-Request-ID',res.locals.requestId);
  res.set('Cache-Control','no-store');res.set('X-Robots-Tag','noindex');
  const origin=req.get('Origin');
  if(origin&&!config.origins.includes(origin))throw new ApiError(403,'origin_forbidden');
  if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Access-Control-Allow-Credentials','true');res.vary('Origin');}
  if(req.method==='OPTIONS'){
   if(!origin)throw new ApiError(403,'origin_forbidden');
   res.set('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,DELETE,OPTIONS');
   res.set('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token');res.status(204).end();return;
  }
  if(!['GET','HEAD'].includes(req.method)&&(!origin||!config.origins.includes(origin)))throw new ApiError(403,'origin_forbidden');
  next();
 });
 app.use('/api',(req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)&&!req.is('application/json'))throw new ApiError(415,'json_required');next();
 });
 app.use(express.json({limit:'16kb',strict:true}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.get('/health/ready',async(_req,res)=>{try{await db.query('SELECT 1');}catch(error){if(error instanceof BusyError)throw error;throw new ApiError(503,'database_unavailable');}res.json({status:'ready'});});
 const audit=async(client:PoolClient,actor:string|null,target:string|null,action:string)=>{await client.query('INSERT INTO jt_audit_events(actor_id,target_id,action) VALUES($1,$2,$3)',[actor,target,action]);};
 const requireAuth:RequestHandler=async(req,res,next)=>{
  const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
  if(!/^[a-f0-9]{64}$/.test(raw))throw new ApiError(401,'unauthenticated');
  const tokenHash=digest(config.secret,'session:'+raw);
  const row=await db.query<UserRow>(`SELECT u.* FROM jt_admin_sessions s JOIN jt_users u ON u.id=s.user_id
   WHERE s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-($2*interval '1 second') AND u.active=true`,[tokenHash,config.sessionIdle]);
  if(!row.rowCount){clearCookie(res);throw new ApiError(401,'unauthenticated');}
  await db.query('UPDATE jt_admin_sessions SET last_seen_at=now() WHERE token_hash=$1',[tokenHash]);
  res.locals.auth={user:row.rows[0],tokenHash,csrfToken:digest(config.secret,'csrf:'+raw)};next();
 };
 const csrf:RequestHandler=(req,res,next)=>{
  if(!equal(req.get('X-CSRF-Token')||'',auth(res).csrfToken))throw new ApiError(403,'csrf_invalid');next();
 };
 const root:RequestHandler=(_req,res,next)=>{
  if(auth(res).user.must_change_password)throw new ApiError(403,'password_change_required');
  if(auth(res).user.role!=='root')throw new ApiError(403,'forbidden');next();
 };
 async function rateLimit(key:string,limit:number){
  const result=await db.query(`INSERT INTO jt_rate_limits(key_hash,hits,expires_at) VALUES($1,1,now()+interval '15 minutes')
   ON CONFLICT(key_hash) DO UPDATE SET hits=CASE WHEN jt_rate_limits.expires_at<=now() THEN 1 ELSE jt_rate_limits.hits+1 END,
   expires_at=CASE WHEN jt_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE jt_rate_limits.expires_at END RETURNING hits`,[digest(config.secret,'rate:'+key)]);
  if(result.rows[0].hits>limit)throw new ApiError(429,'login_limited');
 }
 app.post('/api/v1/auth/login',async(req,res)=>{
  const body=object(req.body,['username','password']);const name=username(body.username);const pass=text(body.password,1,128);
  await rateLimit('ip:'+req.ip,config.loginLimit*3);await rateLimit('username:'+name,config.loginLimit);
  const result=await db.query<UserRow>('SELECT * FROM jt_users WHERE username=$1',[name]);const user=result.rows[0];
  const valid=await verifyPassword(pass,user?.password_hash||dummy);
  if(!valid||!user?.active){await db.transaction(client=>audit(client,null,user?.id||null,'login_failed'));throw new ApiError(401,'invalid_credentials');}
  const raw=token();
  await db.transaction(async client=>{
   // Serialize with suspension/reset/password changes; don't create sessions from stale credentials.
   const current=await client.query<UserRow>('SELECT * FROM jt_users WHERE id=$1 FOR UPDATE',[user.id]);
   if(!current.rows[0]?.active||current.rows[0].password_hash!==user.password_hash)throw new ApiError(401,'invalid_credentials');
   await client.query('DELETE FROM jt_admin_sessions WHERE expires_at<=now()');
   await client.query("INSERT INTO jt_admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3*interval '1 second'))",[digest(config.secret,'session:'+raw),user.id,config.sessionMax]);
   await audit(client,user.id,user.id,'login_succeeded');
  });
  res.cookie(cookieName,raw,{...cookieOptions,maxAge:config.sessionMax*1000});
  res.json({user:publicUser(user),csrfToken:digest(config.secret,'csrf:'+raw)});
 });
 app.get('/api/v1/auth/me',requireAuth,(_req,res)=>res.json({user:publicUser(auth(res).user),csrfToken:auth(res).csrfToken}));
 app.post('/api/v1/auth/logout',requireAuth,csrf,async(_req,res)=>{
  const a=auth(res);await db.transaction(async client=>{await client.query('DELETE FROM jt_admin_sessions WHERE token_hash=$1',[a.tokenHash]);await audit(client,a.user.id,a.user.id,'logout');});clearCookie(res);res.status(204).end();
 });
 app.put('/api/v1/auth/password',requireAuth,csrf,async(req,res)=>{
  const body=object(req.body,['currentPassword','newPassword']);const current=text(body.currentPassword,1,128);const next=password(body.newPassword);
  if(current===next)throw new ApiError(400,'invalid_input');
  const a=auth(res);
  // Bound expensive verification attempts across sessions/processes.
  await rateLimit('password:'+a.user.id,config.loginLimit);
  await db.transaction(async client=>{
   const user=(await client.query<UserRow>('SELECT * FROM jt_users WHERE id=$1 FOR UPDATE',[a.user.id])).rows[0];
   if(!user?.active||!(await client.query('SELECT 1 FROM jt_admin_sessions WHERE token_hash=$1',[a.tokenHash])).rowCount)throw new ApiError(401,'unauthenticated');
   if(!await verifyPassword(current,user.password_hash))throw new ApiError(401,'invalid_credentials');
   await client.query('UPDATE jt_users SET password_hash=$1,must_change_password=false,updated_at=now() WHERE id=$2',[await hashPassword(next),user.id]);
   await client.query('DELETE FROM jt_admin_sessions WHERE user_id=$1',[user.id]);await audit(client,user.id,user.id,'password_changed');
  });
  clearCookie(res);res.status(204).end();
 });
 app.patch('/api/v1/auth/profile',requireAuth,csrf,async(req,res)=>{
  const a=auth(res);if(a.user.must_change_password)throw new ApiError(403,'password_change_required');
  const body=object(req.body,['displayName','email']);const display=text(body.displayName,0,100).trim();const mail=email(body.email);
  const user=await db.transaction(async client=>{
   const result=await client.query<UserRow>('UPDATE jt_users SET display_name=$1,email=$2,updated_at=now() WHERE id=$3 RETURNING *',[display,mail,a.user.id]);if(!result.rowCount)throw new ApiError(401,'unauthenticated');await audit(client,a.user.id,a.user.id,'profile_updated');return result.rows[0];
  });res.json({user:publicUser(user)});
 });
 app.get('/api/v1/admin/users',requireAuth,root,async(_req,res)=>{
  const result=await db.query<UserRow>('SELECT * FROM jt_users ORDER BY created_at,id LIMIT 200');res.json({users:result.rows.map(publicUser)});
 });
 app.post('/api/v1/admin/users',requireAuth,csrf,root,async(req,res)=>{
  const body=object(req.body,['username','password','displayName','email']);const name=username(body.username);const pass=password(body.password);const display=text(body.displayName??'',0,100).trim();const mail=email(body.email);
  const hash=await hashPassword(pass);const actor=auth(res).user.id;
  const user=await db.transaction(async client=>{
   const result=await client.query<UserRow>("INSERT INTO jt_users(id,username,display_name,email,role,password_hash,must_change_password) VALUES($1,$2,$3,$4,'admin',$5,true) RETURNING *",[randomUUID(),name,display,mail,hash]);
   await audit(client,actor,result.rows[0].id,'admin_created');return result.rows[0];
  });res.status(201).json({user:publicUser(user)});
 });
 app.patch('/api/v1/admin/users/:id',requireAuth,csrf,root,async(req,res)=>{
  const target=id(req);const body=object(req.body,['active']);if(typeof body.active!=='boolean')throw new ApiError(400,'invalid_input');
  const user=await db.transaction(async client=>{
   const current=(await client.query<UserRow>('SELECT * FROM jt_users WHERE id=$1 FOR UPDATE',[target])).rows[0];
   if(!current)throw new ApiError(404,'not_found');if(current.role==='root')throw new ApiError(403,'root_protected');
   const result=await client.query<UserRow>('UPDATE jt_users SET active=$1,updated_at=now() WHERE id=$2 RETURNING *',[body.active,target]);
   if(!body.active)await client.query('DELETE FROM jt_admin_sessions WHERE user_id=$1',[target]);
   await audit(client,auth(res).user.id,target,body.active?'admin_enabled':'admin_disabled');return result.rows[0];
  });res.json({user:publicUser(user)});
 });
 app.delete('/api/v1/admin/users/:id',requireAuth,csrf,root,async(req,res)=>{
  const target=id(req);object(req.body,[]);
  await db.transaction(async client=>{
   const user=(await client.query<UserRow>('SELECT * FROM jt_users WHERE id=$1 FOR UPDATE',[target])).rows[0];
   if(!user)throw new ApiError(404,'not_found');if(user.role==='root')throw new ApiError(403,'root_protected');
   // Sessions cascade; audit entries remain, with the removed target anonymized by the FK.
   await audit(client,auth(res).user.id,target,'admin_deleted');
   await client.query('DELETE FROM jt_users WHERE id=$1',[target]);
  });res.status(204).end();
 });
 app.post('/api/v1/admin/users/:id/password',requireAuth,csrf,root,async(req,res)=>{
  const target=id(req);const body=object(req.body,['password']);const hash=await hashPassword(password(body.password));
  await db.transaction(async client=>{
   const user=(await client.query<UserRow>('SELECT * FROM jt_users WHERE id=$1 FOR UPDATE',[target])).rows[0];
   if(!user)throw new ApiError(404,'not_found');if(user.role==='root')throw new ApiError(403,'root_protected');
   await client.query('UPDATE jt_users SET password_hash=$1,must_change_password=true,updated_at=now() WHERE id=$2',[hash,target]);
   await client.query('DELETE FROM jt_admin_sessions WHERE user_id=$1',[target]);await audit(client,auth(res).user.id,target,'admin_password_reset');
  });res.status(204).end();
 });
 app.use((_req,_res)=>{throw new ApiError(404,'not_found');});
 const handleError:ErrorRequestHandler=(error,_req,res,_next)=>{
  let status=500,code='internal_error';
  if(error instanceof ApiError){status=error.status;code=error.code;}
  else if(error instanceof BusyError){status=503;code='database_busy';res.set('Retry-After',String(config.limits.retryAfter));}
  else if(error?.code==='23505'){status=409;code='username_taken';}
  else if(error?.type==='entity.too.large'){status=413;code='payload_too_large';}
  else if(error instanceof SyntaxError&&'body' in error){status=400;code='invalid_json';}
  if(status===429)res.set('Retry-After','900');
  if(status===500)console.error(JSON.stringify({event:'request_failed',requestId:res.locals.requestId}));
  res.status(status).json({error:code,requestId:res.locals.requestId});
 };app.use(handleError);
 return app;
}
