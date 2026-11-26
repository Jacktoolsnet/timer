import {test,expect} from '@playwright/test';
import {createServer as httpServer,type Server} from 'node:http';
import {createServer as netServer} from 'node:net';
import {spawn,type ChildProcess} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// A real browser + Astro proxy + cookie-setting HTTP API, not route mocks.
// No operator .env, password or database is read by this regression test.
let backend:Server,company:ChildProcess,port:number;
const user={id:'10000000-0000-4000-8000-000000000001',username:'root',displayName:'Test Root',email:'',role:'root',active:true,mustChangePassword:false};
const session='proxy-cookie-regression-test';
test.beforeAll(async()=>{
 test.setTimeout(60000);
 const listener=netServer();await new Promise<void>(resolve=>listener.listen(0,'127.0.0.1',resolve));port=(listener.address() as {port:number}).port;await new Promise<void>(resolve=>listener.close(()=>resolve()));
 backend=httpServer((req,res)=>{
  const json=(body:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  if(req.headers.origin&&!['localhost','127.0.0.1'].some(host=>req.headers.origin===`http://${host}:${port}`)){json({error:'origin_forbidden'},403);return;}
  if(req.url==='/api/v1/auth/login'&&req.method==='POST'){
   req.resume();res.setHeader('Set-Cookie',`jt_admin_dev=${session}; Path=/; HttpOnly; SameSite=Lax`);json({user,csrfToken:'proxy-csrf'});return;
  }
  if(!req.headers.cookie?.includes(`jt_admin_dev=${session}`)){json({error:'unauthenticated'},401);return;}
  if(req.url==='/api/v1/auth/me'){json({user,csrfToken:'proxy-csrf'});return;}
  if(req.url==='/api/v1/admin/users'){json({users:[user]});return;}
  if(req.url==='/api/v1/auth/logout'&&req.headers['x-csrf-token']==='proxy-csrf'){
   req.resume();res.setHeader('Set-Cookie','jt_admin_dev=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');res.writeHead(204);res.end();return;
  }
  json({error:'not_found'},404);
 });
 await new Promise<void>(resolve=>backend.listen(0,'127.0.0.1',resolve));const apiPort=(backend.address() as {port:number}).port;
 company=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--port',String(port),'--ignore-lock'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),detached:process.platform!=='win32',stdio:'ignore',
  env:{...process.env,PUBLIC_BACKEND_URL:`http://127.0.0.1:${apiPort}`},
 });
 let ready=false;
 for(let i=0;i<150;i++){
  try{if((await fetch(`http://127.0.0.1:${port}/de/admin/`)).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw new Error('Isolated Company proxy server did not start');
});
test.afterAll(async()=>{
 if(company?.pid)try{if(process.platform==='win32')company.kill('SIGTERM');else process.kill(-company.pid,'SIGTERM');}catch{}
 if(backend){backend.closeAllConnections();await new Promise<void>(resolve=>backend.close(()=>resolve()));}
});
for(const host of ['localhost','127.0.0.1'])test(`login and reload retain HttpOnly SameSite cookies through the Company proxy on ${host}`,async({page,context})=>{
 const origin=`http://${host}:${port}`;const requests:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/v1/'))requests.push(request.url());});
 await page.goto(origin+'/de/admin/');await expect(page.locator('#admin-toast')).toBeHidden();
 await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('test-password-123!');await page.locator('#admin-login-form button').click();
 await expect(page.locator('#admin-workspace')).toBeVisible();await expect(page.locator('#admin-users-panel')).toBeVisible();
 const cookie=(await context.cookies(origin)).find(cookie=>cookie.name==='jt_admin_dev');
 expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');
 await page.reload();await expect(page.locator('#admin-workspace')).toBeVisible();
 expect(requests.length).toBeGreaterThan(3);expect(requests.every(url=>new URL(url).origin===origin)).toBe(true);
 await page.locator('#admin-logout').click();await expect(page.locator('#admin-login-panel')).toBeVisible();
 expect((await context.cookies(origin)).some(cookie=>cookie.name==='jt_admin_dev')).toBe(false);
});
