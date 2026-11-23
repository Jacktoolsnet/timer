import {test,expect} from '@playwright/test';
import {languages} from '../src/lib/i18n';
import {getBlogPath,getBlogPosts,getBlogPost} from '../src/lib/blog';
import {blogUi} from '../src/lib/blog-ui';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.fulfill({body:''}));
});
for(const lang of languages){
 const ui=blogUi[lang];
 test(`${lang}: homepage, index and series stay in the selected language`,async({page})=>{
  await page.goto(`/${lang}/`);
  await expect(page.locator('.header-nav .home-blog-link')).toHaveAttribute('href',getBlogPath(lang));
  await expect(page.locator('.blog-home h2')).toHaveText(ui.homeTitle);
  await expect(page.locator('.blog-home .post-action')).toHaveText(ui.read);
  await page.locator('.home-blog-link').click();
  await expect(page.locator('.blog-post-card h3')).toHaveText(getBlogPosts(lang).map(post=>post.title));
  await page.locator('.blog-post-card').first().click();
  await expect(page).toHaveURL(new RegExp(getBlogPath(lang,'surface')+'$'));
  await expect(page.locator('.article-sidebar h2')).toHaveText(ui.toc);
  // Resolve the blocked ad before scrolling across this long article: its
  // timeout can otherwise collapse the slot just as the link is clicked.
  await page.locator('ins.adsbygoogle').evaluate(slot=>slot.setAttribute('data-ad-status','unfilled'));
  await expect(page.locator('[data-ad-placement]')).toBeHidden();
  await page.locator('.article-series a').click();
  await expect(page).toHaveURL(new RegExp(getBlogPath(lang,'nulltopic')+'$'));
  await expect(page.locator('h1')).toHaveText(getBlogPost(lang,'nulltopic').title);
  await expect(page.locator('.article-body section')).toHaveCount(8);
  await expect(page.locator('.conversation-example li')).toHaveCount(3);
  await expect(page.locator('.site-footer a[href$="/blog/"]')).toHaveAttribute('href',getBlogPath(lang));
 });
 test(`${lang}: complete translated pages, reciprocal SEO and language switch`,async({page,request})=>{
  for(const key of ['index','nulltopic','surface'] as const){
   const path=getBlogPath(lang,key);const canonical='https://jacktools.net'+path;
   await page.goto(path);
   await expect(page.locator('html')).toHaveAttribute('lang',lang);
   await expect(page.locator('h1')).toHaveCount(1);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',canonical);
   await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',key==='index'?ui.indexDescription:getBlogPost(lang,key).description);
   await expect(page.locator('link[hreflang]')).toHaveCount(5);
   for(const other of languages)await expect(page.locator(`link[hreflang="${other}"]`)).toHaveAttribute('href','https://jacktools.net'+getBlogPath(other,key));
   await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href','https://jacktools.net'+getBlogPath('en',key));
   const schemas=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(el=>{const data=JSON.parse(el.textContent!);return data['@graph']??[data];}));
   const schema=schemas.find(data=>data['@type']===(key==='index'?'Blog':'BlogPosting'));
   expect(schema.inLanguage).toBe(lang);
   if(key!=='index'){
    expect(schema.headline).toBe(getBlogPost(lang,key).title);
    expect((await request.get(new URL(schema.image).pathname)).ok()).toBe(true);
    await expect(page.locator('.article-body section')).toHaveCount(key==='surface'?10:8);
    if(lang!=='de'){
     await expect(page.locator('.blog-article')).not.toContainText(/In diesem Artikel|Ein altes Surface|Noch keine Agenten|Zum Nachlesen|Schreib uns dein Feedback|DEIN-WLAN-NAME|Die Grundlage steht/);
    }
    for(const link of await page.locator('.article-sidebar a').all())await expect(page.locator((await link.getAttribute('href'))!)).toHaveCount(1);
   }
   await page.locator('#palette-dropdown summary').click();
   await expect(page.locator('.language-page-note')).toHaveCount(0);
   for(const other of languages)await expect(page.locator(`.language-menu a[lang="${other}"]`)).toHaveAttribute('href',new RegExp(getBlogPath(other,key)+'$'));
   const target=languages.find(other=>other!==lang)!;
   await page.locator(`.language-menu a[lang="${target}"]`).click();
   await expect(page).toHaveURL(new RegExp(getBlogPath(target,key)+'$'));
  }
 });
 test(`${lang}: layout, diagrams, copy labels and print work for translated content`,async({page},info)=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as any).__copiedCode=text;}}}));
  for(const post of getBlogPosts(lang)){
   await page.goto(post.path);
   for(const style of ['technical','soft','minimal','warm']){
    await page.evaluate(style=>Object.assign(document.documentElement.dataset,{style,fontSize:'3',theme:'dark'}),style);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${post.path}/${style}`).toBe(true);
   }
   await page.evaluate(()=>Object.assign(document.documentElement.dataset,{style:'technical',fontSize:'0',theme:'light'}));
   // SVG text must remain inside both the canvas and individual cards.
   expect(await page.locator('.nulltopic-illustration svg').evaluateAll(nodes=>nodes.every(svg=>Array.from(svg.querySelectorAll('text')).every(text=>{
    const box=(text as SVGGraphicsElement).getBBox();
    const group=text.closest('g[transform]');
    const rect=group?.querySelector('rect');
    return box.x>=0&&box.y>=0&&box.x+box.width<=(rect?Number(rect.getAttribute('width')):(svg as SVGSVGElement).viewBox.baseVal.width)-3;
   })))).toBe(true);
   if(post.key==='surface'){
    await expect(page.locator('.blog-code')).toHaveCount(10);
    await expect(page.locator('.installer-settings>div')).toHaveCount(8);
    const block=page.locator('.blog-code').first();
    await expect(block.locator('button')).toHaveAttribute('title',ui.copy);
    await block.locator('button').click();
    expect(await page.evaluate(()=>(window as any).__copiedCode)).toBe(await block.locator('pre code').textContent());
    await expect(block.getByRole('status')).toHaveText(ui.copied);
    await page.locator('#spickzettel').scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/blog-reference-${lang}-${info.project.name}.png`});
   }
   await page.emulateMedia({media:'print'});
   await expect(page.locator('.article-sidebar')).toBeHidden();
   await expect(page.locator('[data-ad-placement]')).toBeHidden();
   for(const button of await page.locator('.code-copy').all())await expect(button).toBeHidden();
   await expect(page.locator('.article-cover svg')).toBeVisible();
   await page.emulateMedia({media:'screen'});
  }
 });
}
test.describe('translated content without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 for(const lang of ['en','es','fr'] as const)test(`${lang}: all article content and navigation are server-rendered`,async({page})=>{
  for(const post of getBlogPosts(lang)){
   await page.goto(post.path);
   await expect(page.locator('h1')).toHaveText(post.title);
   await expect(page.locator('.article-body section')).toHaveCount(post.key==='surface'?10:8);
   if(post.key==='surface'){
    await expect(page.locator('.blog-code')).toHaveCount(10);
    for(const button of await page.locator('.code-copy').all())await expect(button).toBeHidden();
   }
   await expect(page.locator('.article-series a')).toHaveAttribute('href',getBlogPath(lang,post.key==='surface'?'nulltopic':'surface'));
  }
 });
});
