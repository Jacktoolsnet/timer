import {test,expect,type Page} from '@playwright/test';
type User={id:string;username:string;displayName:string;email:string;role:'root'|'admin';active:boolean;mustChangePassword:boolean};
async function mockBackend(page:Page,role:'root'|'admin'='root',mustChange=false){
 const current:User={id:'10000000-0000-4000-8000-000000000001',username:role,displayName:'Test '+role,email:'',role,active:true,mustChangePassword:mustChange};
 const users=[current];let signedIn=false;
 await page.route('**/api/v1/**',async route=>{
  const req=route.request();const path=new URL(req.url()).pathname.replace('/api/v1/','');const method=req.method();
  const headers={'Access-Control-Allow-Origin':new URL(page.url()).origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-CSRF-Token'};
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
  if(target&&method==='DELETE'){users.splice(users.indexOf(target),1);return respond({},204);}
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
 await expect(page.locator('.admin-heading')).toHaveCount(0);
 await expect(page.locator('.site-header .header-nav')).toHaveCount(0);
 await expect(page.locator('#admin-header-session')).toBeHidden();
 await expect(page.locator('#admin-login-panel>p')).toHaveCount(0);
 await expect(page.locator('#admin-status')).toBeEmpty();
 await expect(page.locator('#admin-login-title')).toHaveClass('sr-only');
 await expect(page.locator('.admin-login-art svg')).toBeVisible();
 const art=await page.locator('.admin-login-art').boundingBox();const form=await page.locator('#admin-login-form').boundingBox();
 expect(art).not.toBeNull();expect(form).not.toBeNull();
 if(page.viewportSize()!.width>580)expect(art!.x+art!.width).toBeLessThan(form!.x);
 else expect(art!.y+art!.height).toBeLessThan(form!.y);
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
 await mockBackend(page);await page.goto('/de/admin/');await signIn(page);await page.locator('#admin-users-tile').click();await expect(page.locator('#admin-users-panel')).toBeVisible();
 await page.locator('#admin-create-open').click();await expect(page.locator('#admin-create-dialog')).toBeVisible();
 await page.locator('#admin-create-form [name=username]').fill('alice');await page.locator('#admin-create-form [name=displayName]').fill('<img src=x onerror=alert(1)>');await page.locator('#admin-create-form [name=password]').fill('temporary-password-123!');await page.locator('#admin-create-form button[type=submit]').click();
 const alice=page.locator('.admin-user').filter({hasText:'alice'});await expect(alice).toBeVisible();await expect(alice.locator('img')).toHaveCount(0);await expect(page.locator('#admin-create-form [name=password]')).toHaveValue('');
 page.on('dialog',()=>{throw new Error('Unexpected browser dialog');});
 await alice.getByRole('button',{name:'Sperren',exact:true}).click();await expect(page.locator('#admin-block-dialog')).toBeVisible();await expect(page.locator('#admin-block-username')).toHaveText('alice');await expect(page.locator('#admin-block-cancel')).toBeFocused();
 await page.locator('#admin-block-cancel').click();await expect(alice).toContainText('Aktiv');
 await alice.getByRole('button',{name:'Sperren',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('#admin-block-dialog')).not.toBeVisible();await expect(alice).toContainText('Aktiv');
 await alice.getByRole('button',{name:'Sperren',exact:true}).click();await page.locator('#admin-block-confirm').click();await expect(page.locator('#admin-block-dialog')).not.toBeVisible();await expect(alice).toContainText('Gesperrt');
 await alice.getByRole('button',{name:'Passwort zurücksetzen',exact:true}).click();await expect(page.locator('#admin-reset-dialog')).toBeVisible();
 await page.locator('#admin-reset-form [name=password]').fill('new-temporary-password!');await page.locator('#admin-reset-form button[type=submit]').click();await expect(page.locator('#admin-reset-dialog')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);expect(await page.evaluate(()=>sessionStorage.length)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.site-header #admin-identity')).toHaveText('Test root');await expect(page.locator('.site-header #admin-logout')).toBeVisible();
 await page.locator('#admin-logout').click();await expect(page.locator('#admin-header-session')).toBeHidden();await expect(page.locator('#admin-identity')).toBeEmpty();await expect(page.locator('#admin-workspace')).toBeHidden();await expect(page.locator('#jt-admin')).toHaveAttribute('data-state','signed-out');await expect(page.locator('#admin-users')).toBeEmpty();
});
test('ordinary admins cannot see account management and must change temporary password',async({page})=>{
 await mockBackend(page,'admin',true);await page.goto('/en/admin/');await signIn(page);
 await expect(page.locator('#admin-users-panel')).toBeHidden();await expect(page.locator('#admin-profile-panel')).toBeHidden();await expect(page.locator('#admin-password-required')).toBeVisible();
 await page.locator('#admin-password-form [name=currentPassword]').fill('test-password-123!');await page.locator('#admin-password-form [name=newPassword]').fill('new-password-123!');await page.locator('#admin-password-form button').click();await expect(page.locator('#admin-login-panel')).toBeVisible();await expect(page.locator('#admin-status')).toContainText('Please sign in again');
});
test('wrong password and backend outage show readable errors',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('wrong');await page.locator('#admin-login-form button').click();await expect(page.locator('#admin-status')).toHaveText('Access denied');
 await page.unroute('**/api/v1/**');await page.route('**/api/v1/**',route=>route.abort());await page.reload();await expect(page.locator('#admin-status')).toContainText('Backend unavailable');await expect(page.locator('#admin-login-form button')).toBeEnabled();
});

test('login errors appear in a dismissible toast without moving the form',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');
 await expect(page.locator('#admin-toast')).toBeHidden();const before=await page.locator('#admin-login-panel').boundingBox();
 await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('wrong');await page.locator('#admin-login-form button').click();
 await expect(page.locator('#admin-toast')).toBeVisible();await expect(page.locator('#admin-toast')).toHaveAttribute('role','alert');await expect(page.locator('#admin-status')).toHaveText('Access denied');
 const after=await page.locator('#admin-login-panel').boundingBox();expect(Math.abs(after!.y-before!.y)).toBeLessThan(2);
 await page.locator('#admin-toast-close').click();await expect(page.locator('#admin-toast')).toBeHidden();await expect(page.locator('#admin-login-form [name=username]')).toBeFocused();
});
test('a cookie rejected after successful login is not reported as session expiration',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');await expect(page.locator('#jt-admin')).not.toHaveAttribute('aria-busy','true');
 await page.route('**/api/v1/auth/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'unauthenticated'})}));
 await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('test-password-123!');await page.locator('#admin-login-form button').click();
 await expect(page.locator('#admin-toast')).toBeVisible();await expect(page.locator('#admin-status')).toContainText('could not be established');await expect(page.locator('#admin-status')).not.toContainText('expired');await expect(page.locator('#admin-workspace')).toBeHidden();
});
test('a previously active session that expires does receive an expiration toast',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');await signIn(page);await page.locator('#admin-profile-tile').click();await expect(page.locator('#admin-profile-page')).toBeVisible();
 await page.route('**/api/v1/auth/profile',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'unauthenticated'})}));
 await page.locator('#admin-profile-form button').click();await expect(page.locator('#admin-login-panel')).toBeVisible();await expect(page.locator('#admin-status')).toContainText('Session expired');await expect(page.locator('#admin-toast')).toHaveAttribute('role','alert');
});
test('toast errors remain visible above the password reset dialog',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/');await signIn(page);await page.locator('#admin-users-tile').click();await expect(page.locator('#admin-users-panel')).toBeVisible();
 await page.locator('#admin-create-open').click();await expect(page.locator('#admin-create-dialog')).toBeVisible();
 await page.locator('#admin-create-form [name=username]').fill('alice');await page.locator('#admin-create-form [name=password]').fill('temporary-password!');await page.locator('#admin-create-form button[type=submit]').click();
 await page.locator('.admin-user').filter({hasText:'alice'}).getByRole('button',{name:'Reset password',exact:true}).click();
 await page.route('**/api/v1/admin/users/*/password',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_input'})}));
 await page.locator('#admin-reset-form [name=password]').fill('temporary-reset-password!');await page.locator('#admin-reset-form button[type=submit]').click();
 await expect(page.locator('#admin-reset-dialog #admin-toast')).toBeVisible();await expect(page.locator('#admin-status')).toContainText('check');
 await page.locator('#admin-toast-close').click();await expect(page.locator('#admin-reset-form [name=password]')).toBeFocused();
 await page.locator('#admin-reset-cancel').click();await expect(page.locator('#admin-toast')).toBeHidden();
});

test('access denied toast dismisses automatically after three seconds',async({page})=>{
 await mockBackend(page);await page.goto('/de/admin/');
 await page.locator('#admin-login-form [name=username]').fill('root');await page.locator('#admin-login-form [name=password]').fill('wrong');await page.locator('#admin-login-form button').click();
 await expect(page.locator('#admin-status')).toHaveText('Zugriff verweigert');
 await expect(page.locator('#admin-toast')).toBeVisible();
 await expect(page.locator('#admin-toast')).toBeHidden({timeout:4500});
});

test('dashboard tiles lead to separate pages, survive reload and return to overview',async({page})=>{
 await mockBackend(page);await page.goto('/de/admin/');await signIn(page);
 await expect(page.locator('#admin-overview')).toBeVisible();await expect(page.locator('#admin-profile-page')).toBeHidden();await expect(page.locator('#admin-users-panel')).toBeHidden();
 await page.locator('#admin-profile-tile').click();await expect(page).toHaveURL(/\/de\/admin\/profile\//);
 await expect(page.locator('#admin-profile-form')).toBeVisible();await expect(page.locator('#admin-users-panel')).toBeHidden();
 await page.reload();await expect(page.locator('#admin-profile-form')).toBeVisible();
 await expect(page.locator('.language-menu a[lang=en]')).toHaveAttribute('href',/\/en\/admin\/profile\/$/);
 await page.locator('#admin-back').click();await expect(page.locator('#admin-overview')).toBeVisible();
 await page.locator('#admin-users-tile').click();await expect(page).toHaveURL(/\/de\/admin\/users\//);await expect(page.locator('#admin-users-panel')).toBeVisible();await expect(page.locator('#admin-profile-page')).toBeHidden();
});
test('ordinary admins cannot access user management via a direct page URL',async({page})=>{
 await mockBackend(page,'admin');await page.goto('/en/admin/users/');await signIn(page);
 await expect(page.locator('#admin-users-panel')).toBeHidden();await expect(page.locator('#admin-users-tile')).toBeHidden();await expect(page.locator('#admin-profile-tile')).toBeVisible();
});

test('create overlay supports cancel and errors, icon actions offer labels, deletion requires confirmation',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/users/');await signIn(page);
 await expect(page.locator('#admin-create-dialog')).not.toBeVisible();
 await expect(page.locator('.admin-user').filter({hasText:'Test root'}).getByRole('button')).toHaveCount(0);
 await page.locator('#admin-create-open').click();await page.locator('#admin-create-form [name=password]').fill('cancelled-password!');
 await page.keyboard.press('Escape');await expect(page.locator('#admin-create-dialog')).not.toBeVisible();await expect(page.locator('#admin-create-form [name=password]')).toHaveValue('');
 await page.locator('#admin-create-open').click();
 await page.locator('#admin-create-form [name=username]').fill('alice');await page.locator('#admin-create-form [name=password]').fill('temporary-password!');
 await page.route('**/api/v1/admin/users',route=>route.request().method()==='POST'?route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'username_taken'})}):route.fallback());
 await page.locator('#admin-create-form button[type=submit]').click();await expect(page.locator('#admin-create-dialog #admin-toast')).toBeVisible();
 await page.unroute('**/api/v1/admin/users');await page.locator('#admin-create-cancel').click();
});
test('account deletion can be cancelled and removes the account only on confirmation',async({page})=>{
 await mockBackend(page);await page.goto('/en/admin/users/');await signIn(page);
 await page.locator('#admin-create-open').click();await page.locator('#admin-create-form [name=username]').fill('alice');await page.locator('#admin-create-form [name=password]').fill('temporary-password!');await page.locator('#admin-create-form button[type=submit]').click();
 await expect(page.locator('#admin-create-dialog')).not.toBeVisible();const row=page.locator('.admin-user').filter({hasText:'alice'});await expect(row).toBeVisible();
 const remove=row.getByRole('button',{name:'Delete account',exact:true});await expect(remove.locator('svg')).toBeVisible();await expect(remove).toHaveAttribute('data-tooltip','Delete account');
 await remove.click();await expect(page.locator('#admin-delete-username')).toHaveText('alice');await expect(page.locator('#admin-delete-cancel')).toBeFocused();await page.locator('#admin-delete-cancel').click();await expect(row).toBeVisible();
 await remove.click();await page.route('**/api/v1/admin/users/*',route=>route.request().method()==='DELETE'?route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'internal_error'})}):route.fallback());
 await page.locator('#admin-delete-confirm').click();await expect(page.locator('#admin-delete-dialog #admin-toast')).toBeVisible();await expect(row).toBeAttached();
 await page.unroute('**/api/v1/admin/users/*');await page.locator('#admin-delete-confirm').click();await expect(page.locator('#admin-delete-dialog')).not.toBeVisible();await expect(row).toHaveCount(0);await expect(page.locator('#admin-status')).toHaveText('Account deleted.');
});
