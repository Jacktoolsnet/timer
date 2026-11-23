import {test,expect} from '@playwright/test';
import {nullTopicPost as post, surfaceBookPost, blogPosts} from '../src/lib/blog';
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
});
test('German blog is discoverable from the homepage and index',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('.header-nav a[href="/de/blog/"]')).toHaveText('Blog');
 await expect(page.locator('.blog-home h2')).toHaveText('Ideen, Projekte und ihre Geschichten.');
 await page.locator('.blog-home .blog-post-card').click();
 await expect(page).toHaveURL(new RegExp(surfaceBookPost.path+'$'));
 await page.getByRole('link',{name:'Zum Blog',exact:true}).click();
 await expect(page).toHaveURL(/\/de\/blog\/$/);
 await expect(page.locator('.blog-post-card')).toHaveCount(2);
 await expect(page.locator('.blog-post-card h3')).toHaveText(blogPosts.map(p=>p.title));
 for(const lang of ['en','es','fr']){
  await page.goto(`/${lang}/`);
  await expect(page.locator('.blog-home')).toHaveCount(0);
 }
});
test('article has complete content, truthful roles, accessible illustrations and working chapters',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(post.path);
 await expect(page.locator('h1')).toHaveText(post.title);
 await expect(page).toHaveTitle(post.title+' · Jacktools.net');
 await expect(page.locator('h1')).not.toContainText('mitlesen');
 await expect(page.locator('.blog-article')).not.toContainText(/Menschen lesen\. Agenten|nur mitlesen|keinen gewöhnlichen Beitragseditor/);
 await expect(page.locator('#operatoren')).toContainText('Operatoren sind dabei mehr als Zuschauer');
 await expect(page.locator('#operatoren')).toContainText('pausieren oder einen Zugang widerrufen');
 await expect(page.locator('#beispiel')).toContainText('bewusst erfunden');
 await expect(page.locator('.nulltopic-illustration svg[role="img"]')).toHaveCount(2);
 for(const svg of await page.locator('.nulltopic-illustration svg').all()){
  await expect(svg.locator('title')).not.toBeEmpty();await expect(svg.locator('desc')).not.toBeEmpty();
 }
 const ids=await page.locator('[id]').evaluateAll(els=>els.map(el=>el.id));
 expect(new Set(ids).size).toBe(ids.length);
 for(const a of await page.locator('.article-sidebar a').all()){
  await expect(page.locator((await a.getAttribute('href'))!)).toHaveCount(1);
 }
 await page.locator('ins.adsbygoogle').evaluate(el=>el.setAttribute('data-ad-status','unfilled'));
 await expect(page.locator('[data-ad-placement]')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/nulltopic-blog-${info.project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});
for(const path of ['/de/blog/',post.path]){
 test(`${path}: canonical, German-only metadata and indexable sitemap entry`,async({page,request})=>{
  await page.goto(path.replace(/\/$/,''));
  const canonical=`https://jacktools.net${path}`;
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',canonical);
  await expect(page.locator('link[hreflang]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCount(1);
  const graph=await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.flatMap(el=>{const s=JSON.parse(el.textContent!);return s['@graph']||[s]}));
  if(path===post.path){
   const schema=graph.find(x=>x['@type']==='BlogPosting');
   expect(schema).toMatchObject({headline:post.title,inLanguage:'de',mainEntityOfPage:{'@id':canonical}});
   expect(schema.datePublished).toBeUndefined();
   expect((await request.get(new URL(schema.image).pathname)).ok()).toBe(true);
   await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content','article');
  }else expect(graph.some(x=>x['@type']==='Blog')).toBe(true);
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`<loc>${canonical}</loc>`);
  await page.locator('#palette-dropdown summary').click();
  await expect(page.locator('.language-page-note')).toContainText('Startseite');
  for(const lang of ['en','es','fr']) await expect(page.locator(`.language-menu a[lang="${lang}"]`)).toHaveAttribute('href',new RegExp(`/${lang}/$`));
 });
}
test('contents navigation starts alongside the article header on desktop',async({page})=>{
 await page.goto(post.path);
 const heading=await page.locator('.article-header').boundingBox();
 const nav=await page.locator('.article-sidebar').boundingBox();
 const cover=await page.locator('.article-cover').boundingBox();
 if(page.viewportSize()!.width>1000){
  expect(Math.abs(nav!.y-heading!.y)).toBeLessThan(2);
  expect(nav!.x+nav!.width).toBeLessThan(heading!.x);
  expect(Math.abs(cover!.x-heading!.x)).toBeLessThan(2);
  expect(nav!.y).toBeLessThan(page.viewportSize()!.height);
 }else{
  expect(heading!.y).toBeLessThan(cover!.y);
  expect(cover!.y+cover!.height).toBeLessThanOrEqual(nav!.y+1);
 }
});
test('both articles use the full content column beneath the cover',async({page})=>{
 for(const article of blogPosts){
  await page.goto(article.path);
  const cover=await page.locator('.article-cover').boundingBox();
  const body=await page.locator('.article-body').boundingBox();
  const paragraph=await page.locator('.article-body section p').first().boundingBox();
  const caption=await page.locator('.article-cover figcaption').boundingBox();
  expect(Math.abs(body!.width-cover!.width)).toBeLessThan(2);
  expect(Math.abs(body!.x-cover!.x)).toBeLessThan(2);
  expect(Math.abs(paragraph!.width-body!.width)).toBeLessThan(2);
  expect(Math.abs(caption!.width-cover!.width)).toBeLessThan(2);
 }
});
test('article fits all styles in light/dark and largest font size',async({page})=>{
 await page.goto(post.path);
 for(const style of ['technical','warm','soft','minimal'])for(const theme of ['light','dark']){
  await page.evaluate(({style,theme})=>{Object.assign(document.documentElement.dataset,{style,theme,fontSize:'3'});}, {style,theme});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${style}/${theme}`).toBe(true);
  await expect(page.locator('h1')).toBeVisible();
 }
});
test('reading pages start without background motion but respect the local switch',async({page})=>{
 await page.goto(post.path);
 const canvas=page.locator('#ambient-background');
 await expect(canvas).toBeHidden();
 await page.locator('#palette-dropdown summary').click();
 const toggle=page.locator('#background-motion');
 await expect(toggle).not.toBeChecked();
 await toggle.check();await expect(canvas).toBeVisible();
 await toggle.uncheck();await expect(canvas).toBeHidden();
});
test('browser print keeps article and diagrams but removes site chrome, navigation and ads',async({page})=>{
 await page.goto(post.path);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.article-sidebar')).toBeHidden();
 await expect(page.locator('.site-header')).toBeHidden();
 await expect(page.locator('.site-footer')).toBeHidden();
 await expect(page.locator('[data-ad-placement]')).toBeHidden();
 await expect(page.locator('h1')).toBeVisible();
 await expect(page.locator('.article-diagram svg')).toBeVisible();
 await expect(page.locator('#fazit-heading')).toBeVisible();
});
test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('article, illustrations and links are server-rendered',async({page})=>{
  await page.goto('/de/blog/');await page.locator(`.blog-post-card[href="${post.path}"]`).click();
  await expect(page.locator('h1')).toHaveText(post.title);
  await expect(page.locator('.article-body section')).toHaveCount(8);
  await expect(page.locator('.nulltopic-illustration svg')).toHaveCount(2);
  await page.locator('.article-sidebar a[href="#operatoren"]').click();
  await expect(page).toHaveURL(/#operatoren$/);
 });
});
