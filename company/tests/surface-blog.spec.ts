import {test,expect} from '@playwright/test';
import {surfaceBookPost as post,nullTopicPost} from '../src/lib/blog';
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.fulfill({body:''}));
});
test('second article is discoverable and both series links work',async({page})=>{
 await page.goto('/de/');
 await page.locator('.blog-home .blog-post-card').click();
 await expect(page).toHaveURL(new RegExp(post.path+'$'));
 await expect(page.locator('h1')).toHaveText(post.title);
 await page.locator('.article-series a').click();
 await expect(page).toHaveURL(new RegExp(nullTopicPost.path+'$'));
 await page.locator('.article-series a').click();
 await expect(page).toHaveURL(new RegExp(post.path+'$'));
 await page.goto('/de/blog/');
 await expect(page.locator('.blog-post-card')).toHaveCount(2);
 await expect(page.locator('.blog-post-card').first()).toHaveAttribute('href',post.path);
});
test('personal facts, missing agents, bounded examples and accessible code blocks are present',async({page})=>{
 const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(post.path);
 await expect(page.locator('#ausgangslage')).toContainText('Surface Book der ersten Generation');
 await expect(page.locator('#ausgangslage')).toContainText('Windows 11');
 await expect(page.locator('.blog-article')).not.toContainText(/\b(ich|mich|mir|mein(?:e|en|em|er|es)?)\b/i);
 for(const copy of [post.title,post.description,post.excerpt,post.lead,post.byline])expect(copy).not.toMatch(/\b(ich|mich|mir|mein(?:e|en|em|er|es)?)\b/i);
 await expect(page.locator('#system')).toContainText('Arch Linux mit GNOME');
 await expect(page.locator('#vorbereitung')).toContainText('UEFI');
 await expect(page.locator('#vorbereitung')).toContainText('Secure Boot');
 await expect(page.locator('#wlan')).toContainText('zweite Shell');
 await expect(page.locator('#wlan')).toContainText('Passwort');
 await expect(page.locator('#installation')).toContainText('Daten löschen');
 await expect(page.locator('#webui')).toContainText('Ein vorhandener Schlüssel allein beweist');
 await expect(page.locator('#terminal')).toContainText('noch kein fertiger Agent');
 await expect(page.locator('#terminal')).toContainText('Open Terminal, die Terminal-Integration von Open WebUI');
 await expect(page.locator('#terminal')).toContainText('als eigener Dienst');
 await expect(page.locator('#terminal a[href="https://docs.openwebui.com/features/open-terminal/"]')).toHaveCount(1);
 await expect(page.locator('#ausblick')).toContainText('Im dritten Beitrag');
 await expect(page.locator('#spickzettel .blog-code')).toHaveCount(3);
 await expect(page.locator('#spickzettel .installer-settings > div')).toHaveCount(8);
 for(const text of ['loadkeys de-latin1','iwctl device list','archinstall','NetworkManager','GNOME','Daten löschen','Europe/Berlin'])await expect(page.locator('#spickzettel')).toContainText(text);
 await expect(page.locator('.blog-code pre[tabindex="0"]')).toHaveCount(10);
 const code=await page.locator('.blog-code pre').allTextContents();
 expect(code.join('\n')).toContain('loadkeys de-latin1');
 expect(code.join('\n')).toContain('sudo localectl --no-convert set-keymap de-latin1');
 expect(code.join('\n')).toContain('iwctl device list');
 expect(code.join('\n')).toContain('connect "DEIN-WLAN-NAME"');
 expect(code.join('\n')).not.toMatch(/--passphrase|\bmkfs\b|\bdd\b|sk-[A-Za-z0-9]{8}/);
 await expect(page.getByRole('img',{name:'Ein Surface Book bekommt eine neue Aufgabe',exact:true})).toBeVisible();
 for(const link of await page.locator('.article-sidebar a').all())await expect(page.locator((await link.getAttribute('href'))!)).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('code copy buttons copy exactly their own block and report success or failure',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).__copiedCode=text;}}});
 });
 await page.goto(post.path);
 await expect(page.locator('.code-copy')).toHaveCount(10);
 for(const block of await page.locator('.blog-code').all()){
  const button=block.getByRole('button',{name:/Code kopieren:/});
  await expect(button).toHaveAttribute('title','Code kopieren');
  await expect(button).toHaveText('');
  await button.click();
  expect(await page.evaluate(()=>(window as any).__copiedCode)).toBe(await block.locator('pre code').textContent());
  await expect(block.getByRole('status')).toHaveText('Code kopiert.');
 }
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
 const first=page.locator('.blog-code').first();
 await first.getByRole('button').click();
 await expect(first.getByRole('status')).toContainText('manuell kopieren');
 await expect(first.getByRole('button')).toBeEnabled();
 await page.emulateMedia({media:'print'});
 for(const button of await page.locator('.code-copy').all())await expect(button).toBeHidden();
});
test('German SEO with translated alternatives, public sources, image and sitemap are correct',async({page,request})=>{
 await page.goto(post.path.replace(/\/$/,''));
 const url='https://jacktools.net'+post.path;
 await expect(page.locator('html')).toHaveAttribute('lang','de');
 await expect(page).toHaveTitle(post.title+' · Jacktools.net');
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',url);
 await expect(page.locator('link[hreflang]')).toHaveCount(5);
 await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content','article');
 const graph=await page.locator('script[type="application/ld+json"]').evaluate(el=>JSON.parse(el.textContent!)['@graph']);
 const article=graph.find((x:any)=>x['@type']==='BlogPosting');
 expect(article).toMatchObject({headline:post.title,inLanguage:'de',mainEntityOfPage:{'@id':url}});
 expect(article.datePublished).toBeUndefined();
 expect((await request.get(post.image)).ok()).toBe(true);
 expect(await (await request.get('/sitemap.xml')).text()).toContain(`<loc>${url}</loc>`);
 await expect(page.locator('#quellen a[href*="wiki.archlinux.org"]')).toHaveCount(4);
 await expect(page.locator('#quellen a[href*="support.microsoft.com"]')).toHaveCount(1);
});
test('layout and code remain readable at large fonts, in dark mode and in print',async({page},info)=>{
 await page.goto(post.path);
 for(const style of ['technical','soft','warm','minimal']){
  await page.evaluate(style=>Object.assign(document.documentElement.dataset,{style,fontSize:'3',theme:'dark'}),style);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),style).toBe(true);
  for(const block of await page.locator('.blog-code').all()){
   const box=await block.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  }
 }
 await page.evaluate(()=>Object.assign(document.documentElement.dataset,{style:'technical',fontSize:'0',theme:'light'}));
 await page.screenshot({path:`/tmp/surface-blog-${info.project.name}.png`,fullPage:true});
 const header=await page.locator('.article-header').boundingBox();const nav=await page.locator('.article-sidebar').boundingBox();
 if(page.viewportSize()!.width>1000)expect(Math.abs(header!.y-nav!.y)).toBeLessThan(2);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.article-sidebar')).toBeHidden();
 await expect(page.locator('.article-series')).toBeHidden();
 await expect(page.locator('.site-footer')).toBeHidden();
 await expect(page.locator('[data-ad-placement]')).toBeHidden();
 for(const pre of await page.locator('.blog-code pre').all()){
  await expect(pre).toBeVisible();await expect(pre).toHaveCSS('white-space','pre-wrap');
 }
});
test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('all sections and code examples are server-rendered',async({page})=>{
  await page.goto(post.path);
  await expect(page.locator('h1')).toHaveText(post.title);
  await expect(page.locator('.article-body section')).toHaveCount(10);
  await expect(page.locator('.blog-code pre')).toHaveCount(10);
  for(const button of await page.locator('.code-copy').all())await expect(button).toBeHidden();
  await page.locator('.article-sidebar a[href="#wlan"]').click();
  await expect(page).toHaveURL(/#wlan$/);
 });
});
