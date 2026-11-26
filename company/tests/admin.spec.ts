import {test,expect,type Page} from '@playwright/test';
type User={id:string;username:string;displayName:string;email:string;role:'root'|'admin';active:boolean;mustChangePassword:boolean};
async function mockBackend(page:Page,role:'root'|'admin'='root',mustChange=false){
 const current:User={id:'10000000-0000-4000-8000-000000000001',username:role,displayName:'Test '+role,email:'',role,active:true,mustChangePassword:mustChange};
 const users=[current];let signedIn=false;
 await page.route('**/api/v1/**',async route=>{
  const req=route.request();const path=new URL(req.url()).pathname.replace('/api/v1/','');const method=req.method();
  const headers={'Access-Control-Allow-Origin':new URL(page.url()).origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-CSRF-Token'};
  const respond=(data:unknown={},status=200)=>route.fulfill({status,headers,contentType:'application/json',...(status===204?{}:{body:JSON.stringify(data)})});
  if(method==='OPTIONS')return respond({},204);
  const body=method==='GET'?{}:req.postDataJSON();
  if(path==='auth/login'){
   if(body.password!=='test-password-123!')return respond({error:'invalid_credentials'},401);
   signedIn=true;return respond({user:current,csrfToken:'test-csrf'});
  }
  if(!signedIn)return respond({error:'unauthenticated'},401);
  if(path==='auth/me')return respond({user:current,csrfToken:'test-csrf'});
  if(path==='auth/logout'||path==='auth/password'){signedIn=false;return respond({},204);}
  if(path==='auth/profile'){Object.assign(current,body);return respond({user:current});}
  if(path==='admin/users'&&method==='GET')return respond({users});
  if(path==='admin/users'&&method==='POST'){
   const next:User={id:'20000000-0000-4000-8000-000000000002',username:body.username,displayName:body.displayName,email:body.email,role:'admin',active:true,mustChangePassword:true};users.push(next);return respond({user:next},201);
  }
  const target=users.find(u=>path.includes(u.id));
  if(target&&path.endsWith('/password'))return respond({},204);
  if(target){Object.assign(target,body);return respond({user:target});}
  return respond({error:'not_found'},404);
 });
}
async function signIn(page:Page){
 await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('test-password-123!');await page.locator('#admin-login-form button').click();await expect(page.locator('#admin-workspace')).toBeVisible();
}
for(const lang of ['de','en','es','fr'])test(`admin page is integrated, translated and noindex in ${lang}`,async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await mockBackend(page);await page.goto('/'+lang+'/admin/');
 await expect(page.locator('#admin-login-panel')).toBeVisible();await expect(page.locator('#admin-workspace')).toBeHidden();
 await expect(page.locator('.admin-heading')).toBeHidden();
 await expect(page.locator('#admin-login-panel>p')).toHaveCount(0);
 await expect(page.locator('#admin-status')).toBeEmpty();
 await expect(page.locator('h1:visible')).toHaveCount(1);
 await expect.poll(async()=>{
  const card=await page.locator('#admin-login-panel').boundingBox();const main=await page.locator('#main').boundingBox();
  if(!card||!main)return Infinity;
  return Math.max(Math.abs(card.x+card.width/2-(main.x+main.width/2)),Math.abs(card.y+card.height/2-(main.y+main.height/2)));
 }).toBeLessThan(3);

 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');await expect(page.locator('.site-header .brand')).toBeVisible();
 await expect(page.locator(`.site-footer a[href="/${lang}/admin/"]`)).toHaveText('Admin');
 await expect(page.locator('.language-menu a[lang=en]')).toHaveAttribute('href',/\/en\/admin\//);
 expect((await (await request.get('/sitemap.xml')).text())).not.toContain('/admin');expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('root manages admins without storing credentials and logout clears protected views',async({page})=>{
 await mockBackend(page);await page.goto('/de/admin/');await signIn(page);await expect(page.locator('#admin-users-panel')).toBeVisible();
 await page.locator('#admin-create-form [name=username]').fill('alice');await page.locator('#admin-create-form [name=displayName]').fill('<img src=x onerror=alert(1)>');await page.locator('#admin-create-form [name=password]').fill('temporary-password-123!');await page.locator('#admin-create-form button').click();
 const alice=page.locator('.admin-user').filter({hasText:'alice'});await expect(alice).toBeVisible();await expect(alice.locator('img')).toHaveCount(0);await expect(page.locator('#admin-create-form [name=password]')).toHaveValue('');
 page.on('dialog',d=>d.accept());await alice.getByRole('button',{name:'Sperren',exact:true}).click();await expect(alice).toContainText('Gesperrt');
 await alice.getByRole('button',{name:'Passwort zurücksetzen',exact:true}).click();await expect(page.locator('#admin-reset-dialog')).toBeVisible();
 await page.locator('#admin-reset-form [name=password]').fill('new-temporary-password!');await page.locator('#admin-reset-form button[type=submit]').click();await expect(page.locator('#admin-reset-dialog')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);expect(await page.evaluate(()=>sessionStorage.length)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#admin-logout').click();await expect(page.locator('#admin-workspace')).toBeHidden();await expect(page.locator('#jt-admin')).toHaveAttribute('data-state','signed-out');await expect(page.locator('#admin-users')).toBeEmpty();
});
test('ordinary admins cannot see account management and must change temporary password',async({page})=>{
 await mockBackend(page,'admin',true);await page.goto('/en/admin/');await signIn(page);
 await expect(page.locator('#admin-users-panel')).toBeHidden();await expect(page.locator('#admin-profile-panel')).toBeHidden();await expect(page.locator('#admin-password-required')).toBeVisible();
 await page.locator('#admin-password-form [name=currentPassword]').fill('test-password-123!');await page.locator('#admin-password-form [name=newPassword]').fill('new-password-123!');await page.locator('#admin-password-form button').click();await expect(page.locator('#admin-login-panel')).toBeVisible();await expect(page.locator('#admin-status')).toContainText('Please sign in again');
});
test('wrong password and backend outage show readable errors',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('wrong');await page.locator('#admin-login-form button').click();await expect(page.locator('#admin-status')).toContainText('incorrect');
 await page.unroute('**/api/v1/**');await page.route('**/api/v1/**',route=>route.abort());await page.reload();await expect(page.locator('#admin-status')).toContainText('Backend unavailable');await expect(page.locator('#admin-login-form button')).toBeEnabled();
});
