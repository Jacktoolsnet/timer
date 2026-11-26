import {test,expect,type Page} from '@playwright/test';
async function backend(page:Page,{role='root',forced=false,enabled=true,mail=true}:{role?:'root'|'admin';forced?:boolean;enabled?:boolean;mail?:boolean}={}){
 let checks=0,mails=0,reads=0,checking=false;
 const user={id:'10000000-0000-4000-8000-000000000001',username:role,displayName:'Test '+role,email:'',role,active:true,mustChangePassword:forced};
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  if(path.endsWith('/auth/me'))return route.fulfill({json:{user,csrfToken:'test-csrf'}});
  if(path.endsWith('/certificates/check')){
   expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');checks++;checking=true;reads=0;return route.fulfill({status:202,json:{started:true}});
  }
  if(path.endsWith('/certificates/test-email')){mails++;return route.fulfill({status:204});}
  if(path.endsWith('/admin/certificates')&&method==='GET'){
   if(checking&&reads++>0)checking=false;
   return route.fulfill({json:{
    targets:[{targetKey:'clock.jacktools.net:443',label:'Clock',origin:'https://clock.jacktools.net',host:'clock.jacktools.net',status:checks&&!checking?'ok':'warning',subject:'CN=clock.jacktools.net',issuer:'<img src=x onerror=alert(1)>',subjectAltName:'DNS:clock.jacktools.net',fingerprint:'AA:BB:CC',validFrom:'2026-01-01T00:00:00Z',validTo:'2027-01-01T00:00:00Z',daysRemaining:20,lastCheckedAt:'2026-11-26T12:00:00Z',error:null}],
    summary:{ok:checks&&!checking?1:0,warning:checks&&!checking?0:1,critical:0,expired:0,error:0,unchecked:0},
    configuration:{enabled,cron:'40 0 * * *',timezone:'Europe/Berlin',warningDays:30,criticalDays:14,mailConfigured:mail,recipient:'alerts@example.test',from:'support@jacktools.net'},
    monitor:{running:checking,lastStartedAt:'2026-11-26T12:00:00Z',lastFinishedAt:'2026-11-26T12:00:00Z',lastError:null,lastMailAt:null,lastMailError:null,nextRunAt:'2026-11-27T00:40:00Z'}
   }});
  }
  return route.fulfill({status:404,json:{error:'not_found'}});
 });
 return {checks:()=>checks,mails:()=>mails};
}
for(const lang of ['de','en','es','fr'])test('certificate dashboard matches Company design and is translated in '+lang,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const state=await backend(page);
 await page.goto('/'+lang+'/admin/');
 await page.locator('#admin-certificates-tile').click();
 await expect(page.locator('#admin-certificates-panel')).toBeVisible();await expect(page.locator('#admin-overview')).toBeHidden();
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, follow');
 await expect(page.locator('.language-menu a[lang=en]')).toHaveAttribute('href',/\/en\/admin\/certificates\/$/);
 await expect(page.locator('.cert-row')).toHaveCount(1);await expect(page.locator('#cert-test-mail')).toBeVisible();
 await page.locator('.cert-row').click();await expect(page.locator('#cert-detail-dialog')).toBeVisible();
 await expect(page.locator('#cert-details')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('#cert-details img')).toHaveCount(0);
 await page.locator('#cert-detail-close').click();await page.locator('#cert-check').click();
 await expect.poll(()=>state.checks()).toBe(1);await expect(page.locator('#cert-running')).toBeVisible();
 await expect(page.locator('.cert-badge')).toHaveAttribute('data-status','ok',{timeout:10000});
 await page.locator('#cert-test-mail').click();await expect.poll(()=>state.mails()).toBe(1);
 await expect(page.locator('#admin-toast')).toBeVisible();
 await page.locator('.cert-configuration summary').click();await expect(page.locator('#cert-configuration')).toContainText('Europe/Berlin');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(lang==='de')await page.screenshot({path:'/tmp/jt-certificates-'+test.info().project.name+'.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('ordinary administrators can view certificates but not send test emails',async({page})=>{
 await backend(page,{role:'admin'});await page.goto('/de/admin/certificates/');
 await expect(page.locator('.cert-row')).toHaveCount(1);await expect(page.locator('#cert-test-mail')).toBeHidden();
 await expect(page.locator('#cert-check')).toBeEnabled();
});
test('disabled configuration cannot be checked and missing mail cannot be tested',async({page})=>{
 await backend(page,{enabled:false,mail:false});await page.goto('/de/admin/certificates/');
 await expect(page.locator('#cert-disabled')).toBeVisible();await expect(page.locator('#cert-check')).toBeDisabled();await expect(page.locator('#cert-test-mail')).toBeDisabled();
});
test('temporary-password accounts must change password before opening certificates',async({page})=>{
 await backend(page,{role:'admin',forced:true});await page.goto('/de/admin/certificates/');
 await expect(page.locator('#admin-profile-page')).toBeVisible();await expect(page.locator('#admin-certificates-panel')).toBeHidden();await expect(page.locator('#admin-certificates-tile')).toBeHidden();
});
