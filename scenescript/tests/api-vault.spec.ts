import {test,expect,type Page} from './helpers/editor-test';
import {API_VAULT_KEY} from '../src/lib/api-vault';
import {readFile} from 'node:fs/promises';
const password='My-Unique-Vault-Password42!',openai='sk-project-TEST-NOT-A-REAL-KEY-42',elevenlabs='el-TEST-NOT-A-REAL-KEY-87';
async function start(page:Page){await page.goto('/en/');await page.locator('#open-api-vault').click();await expect(page.locator('#api-vault-lock')).not.toBeVisible();await expect(page.locator('#api-vault-reset')).not.toBeVisible();}
async function fillSetup(page:Page){await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-repeat').fill(password);await page.locator('#api-vault-openai').fill(openai);await page.locator('#api-vault-elevenlabs').fill(elevenlabs);await page.locator('#api-vault-consent').check();}
async function create(page:Page){await fillSetup(page);await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');}
async function raw(page:Page){return page.evaluate(key=>localStorage.getItem(key),API_VAULT_KEY);}
async function download(page:Page){const event=page.waitForEvent('download');await page.locator('#save-project').click();return readFile((await(await event).path())!,'utf8');}

test('encrypted vault creates, unlocks, rotates keys and resets without project changes or API calls',async({page})=>{
 const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/api\.(openai\.com|elevenlabs\.io)/.test(r.url()))requests.push(r.url());});
 await page.goto('/en/');const project=await download(page);await page.locator('#open-api-vault').click();
 await fillSetup(page);await page.locator('#api-vault-password').fill('longbutweakpassword');await page.locator('#api-vault-submit').click();await expect(page.locator('#api-vault-error')).toContainText('uppercase');
 await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-repeat').fill(password+'different');await page.locator('#api-vault-submit').click();await expect(page.locator('#api-vault-error')).toContainText('do not match');
 await create(page);const sealed=(await raw(page))!;for(const value of [password,openai,elevenlabs])expect(sealed).not.toContain(value);
 for(const id of ['password','repeat','openai','elevenlabs'])await expect(page.locator('#api-vault-'+id)).toHaveValue('');
 await expect(page.locator('#api-vault-openai-status')).toHaveText('Saved');
 await page.locator('#api-vault-openai').fill('sk-rotated-TEST-KEY');await page.locator('#api-vault-submit').click();await expect(page.locator('#api-vault-state')).toContainText('saved encrypted');expect(await raw(page)).not.toBe(sealed);
 await page.locator('#api-vault-close').click();const exported=await download(page);expect(exported).toBe(project);for(const value of [password,openai,elevenlabs,'sk-rotated-TEST-KEY',API_VAULT_KEY])expect(exported).not.toContain(value);
 await page.reload();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');await page.locator('#open-api-vault').click();await page.locator('#api-vault-password').fill('wrong-password');await page.locator('#api-vault-submit').click();await expect(page.locator('#api-vault-error')).toContainText('Incorrect password');
 await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');await expect(page.locator('#api-vault-elevenlabs-status')).toHaveText('Saved');
 await page.locator('#api-vault-lock').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');
 // Password forgotten: no password is needed to remove only the local ciphertext.
 await page.locator('#api-vault-reset').click();await expect(page.locator('#api-vault-reset-panel')).toContainText('does not revoke');await page.locator('#api-vault-confirm-reset').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','empty');expect(await raw(page)).toBeNull();
 await page.locator('#api-vault-close').click();expect(await download(page)).toBe(project);expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('idle locking clears secrets but a short tab switch preserves edits, and closing cancels creation',async({page})=>{
 await page.clock.install({time:new Date('2026-10-26T08:00:00Z')});await start(page);await fillSetup(page);
 // Same-turn close must cancel even a write waiting for the browser's lock.
 await page.evaluate(()=>{document.querySelector<HTMLFormElement>('#api-vault-form')!.requestSubmit();document.querySelector<HTMLDialogElement>('#api-vault-dialog')!.close();});await page.waitForTimeout(300);expect(await raw(page)).toBeNull();
 await page.locator('#open-api-vault').click();await create(page);await page.locator('#api-vault-openai').fill('unsaved-sensitive-key');await page.clock.fastForward(10*60*1000+15000);await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');await expect(page.locator('#api-vault-openai')).toHaveValue('');
 await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');
 await page.locator('#api-vault-lock').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');
});

test('corrupt storage recovers via confirmation and cross-tab changes invalidate the unlocked session',async({page})=>{
 await start(page);await create(page);await page.evaluate(key=>{localStorage.setItem(key,'{broken');window.dispatchEvent(new StorageEvent('storage',{key}));},API_VAULT_KEY);await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','corrupt');await expect(page.locator('#api-vault-form')).not.toBeVisible();await expect(page.locator('#api-vault-submit')).not.toBeVisible();
 await page.locator('#api-vault-reset').click();await page.locator('#api-vault-reset-back').click();expect(await raw(page)).toBe('{broken');
 await page.locator('#api-vault-reset').click();await page.locator('#api-vault-confirm-reset').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','empty');await create(page);
 await page.evaluate(key=>{localStorage.removeItem(key);window.dispatchEvent(new StorageEvent('storage',{key}));},API_VAULT_KEY);await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','empty');await expect(page.locator('#api-vault-password')).toHaveValue('');
});

test('blocked local storage keeps the editor usable and shows a copyable vault error',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await expect(page.locator('#api-vault-error')).toContainText('storage is unavailable');await expect(page.locator('#api-vault-error')).toHaveCSS('user-select','text');await expect(page.locator('#api-vault-form')).not.toBeVisible();await page.locator('#api-vault-close').click();await expect(page.locator('#project-title')).toBeVisible();expect(errors).toEqual([]);
});


test('setup and unlock drafts survive switching away to copy API keys',async({page,context})=>{
 await start(page);await fillSetup(page);
 const other=await context.newPage();
 const switchAway=async()=>{
  await other.goto('about:blank');await other.bringToFront();await page.bringToFront();
  // Headless browsers can keep both tabs visible: also exercise the actual handler.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 };
 await switchAway();await expect(page.locator('#api-vault-password')).toHaveValue(password);await expect(page.locator('#api-vault-repeat')).toHaveValue(password);await expect(page.locator('#api-vault-openai')).toHaveValue(openai);await expect(page.locator('#api-vault-elevenlabs')).toHaveValue(elevenlabs);await expect(page.locator('#api-vault-consent')).toBeChecked();expect(await raw(page)).toBeNull();
 await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');await page.locator('#api-vault-openai').fill('sk-unsaved-copy-from-another-tab');await switchAway();await expect(page.locator('#api-vault-openai')).toHaveValue('sk-unsaved-copy-from-another-tab');await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');
 await page.locator('#api-vault-lock').click();await page.locator('#api-vault-password').fill(password);await switchAway();await expect(page.locator('#api-vault-password')).toHaveValue(password);
 await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');await other.close();
});

test('explicit per-provider tests use draft or encrypted keys without saving or generating anything',async({page})=>{
 const calls:Array<{url:string;method:string;headers:Record<string,string>;body:string|null}>=[];
 await page.route('https://api.openai.com/**',async route=>{const r=route.request();if(r.method()!=='OPTIONS')calls.push({url:r.url(),method:r.method(),headers:r.headers(),body:r.postData()});await route.fulfill({status:r.method()==='OPTIONS'?204:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:r.method()==='OPTIONS'?'':JSON.stringify({object:'list',data:[]})});});
 await page.route('https://api.elevenlabs.io/**',async route=>{const r=route.request();if(r.method()!=='OPTIONS')calls.push({url:r.url(),method:r.method(),headers:r.headers(),body:r.postData()});await route.fulfill({status:r.method()==='OPTIONS'?204:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:r.method()==='OPTIONS'?'':JSON.stringify({user_id:'test-user'})});});
 await start(page);await expect(page.locator('#api-vault-test-openai')).toBeDisabled();await page.locator('#api-vault-openai').fill(openai);
 // Testing works before a password or storage consent is supplied; it saves nothing.
 await page.locator('#api-vault-test-openai').click();await expect(page.locator('#api-vault-openai-test-result')).toHaveAttribute('data-state','ok');await expect(page.locator('#api-vault-openai')).toHaveValue(openai);expect(await raw(page)).toBeNull();
 await page.locator('#api-vault-elevenlabs').fill(elevenlabs);await page.locator('#api-vault-test-elevenlabs').click();await expect(page.locator('#api-vault-elevenlabs-test-result')).toHaveAttribute('data-state','ok');
 expect(calls.map(c=>c.url)).toEqual(['https://api.openai.com/v1/models','https://api.elevenlabs.io/v1/user']);for(const c of calls){expect(c.method).toBe('GET');expect(c.body).toBeNull();expect(c.url).not.toContain(openai);expect(c.url).not.toContain(elevenlabs);expect(c.headers).not.toHaveProperty('cookie');}
 expect(calls[0].headers.authorization).toBe('Bearer '+openai);expect(calls[0].headers['xi-api-key']).toBeUndefined();expect(calls[1].headers['xi-api-key']).toBe(elevenlabs);expect(calls[1].headers.authorization).toBeUndefined();
 await create(page);const sealed=await raw(page);await expect(page.locator('#api-vault-openai')).toHaveValue('');await page.locator('#api-vault-test-openai').click();await expect(page.locator('#api-vault-openai-test-result')).toHaveAttribute('data-state','ok');expect(calls.at(-1)!.headers.authorization).toBe('Bearer '+openai);expect(await raw(page)).toBe(sealed);
 await page.locator('#api-vault-openai').fill('sk-different-draft');await expect(page.locator('#api-vault-openai-test-result')).not.toBeVisible();expect(await raw(page)).toBe(sealed);
});

test('key test feedback distinguishes restricted keys and clears stale or cancelled results',async({page})=>{
 let mode='permission',waiting=0,release:()=>void=()=>{};
 await page.route('https://api.elevenlabs.io/**',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return;}
  const selected=mode;if(selected==='delayed'){waiting++;await new Promise<void>(resolve=>release=resolve);}
  await route.fulfill({status:selected==='auth'?401:selected==='rate'?429:selected==='permission'?401:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(selected==='permission'?{detail:{status:'missing_permissions',message:elevenlabs}}:selected==='auth'?{detail:{status:'invalid_api_key',message:elevenlabs}}:{user_id:'test-user'})}).catch(()=>{});
 });
 await start(page);await page.locator('#api-vault-elevenlabs').fill(elevenlabs);
 const result=page.locator('#api-vault-elevenlabs-test-result');await page.locator('#api-vault-test-elevenlabs').click();await expect(result).toHaveAttribute('data-state','permission');await expect(result).not.toContainText(elevenlabs);
 mode='auth';await page.locator('#api-vault-test-elevenlabs').click();await expect(result).toHaveAttribute('data-state','auth');mode='rate';await page.locator('#api-vault-test-elevenlabs').click();await expect(result).toHaveAttribute('data-state','rate');
 mode='delayed';await page.locator('#api-vault-test-elevenlabs').click();await expect(result).toHaveAttribute('data-state','working');await expect.poll(()=>waiting).toBe(1);await page.locator('#api-vault-elevenlabs').fill('different-key');release();await expect(result).not.toBeVisible();
 await page.locator('#api-vault-test-elevenlabs').click();await expect(result).toHaveAttribute('data-state','working');await expect.poll(()=>waiting).toBe(2);await page.locator('#api-vault-close').click();release();await page.locator('#open-api-vault').click();await expect(result).not.toBeVisible();await expect(page.locator('#api-vault-elevenlabs')).toHaveValue('');expect(await raw(page)).toBeNull();
});
