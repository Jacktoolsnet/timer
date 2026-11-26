import {test,expect} from '@playwright/test';
import {getBlogPath,getBlogPost} from '../src/lib/blog';
import copy from '../src/lib/stream-blog.json' with {type:'json'};
for(const lang of ['de','en','es','fr'] as const){
 test(lang+': streaming article is discoverable, localized and has original accessible art',async({page,request})=>{
  await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
  const post=getBlogPost(lang,'stream'),c=copy[lang];
  await page.goto('/'+lang+'/');
  await page.locator('.blog-home .blog-post-card').click();
  await expect(page).toHaveURL(new RegExp(post.path+'$'));
  await expect(page.locator('h1')).toHaveText(c.title);
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content',c.description);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content','article');
  for(const other of ['de','en','es','fr'] as const)await expect(page.locator('link[hreflang="'+other+'"]')).toHaveAttribute('href','https://jacktools.net'+getBlogPath(other,'stream'));
  for(const [id,title,text] of c.sections){
   await expect(page.locator('#'+id+' h2')).toHaveText(title);
   await expect(page.locator('#'+id)).toContainText(text);
   await expect(page.locator('.article-sidebar a[href="#'+id+'"]')).toBeVisible();
  }
  await expect(page.locator('#engine')).toContainText('Node.js');
  await expect(page.locator('.article-body a[href="/'+lang+'/tools/clock/#streamen"]')).toHaveText(c.guide);
  await expect(page.locator('.article-body a[href="https://clock.jacktools.net/'+lang+'/stream/"]')).toHaveText(c.receiver+' ↗');
  const img=page.locator('.article-cover img');
  await expect(img).toHaveAttribute('alt',c.coverCaption);
  await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  const response=await request.get(post.image);expect(response.ok()).toBe(true);
  const svg=await response.text();expect(svg).toContain('<title');expect(svg).toContain('<desc');expect(svg).not.toMatch(/<script|<image|https?:\/\/(?!www.w3.org)/);
  const schema=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(n=>JSON.parse(n.textContent!)['@graph']||[]));
  expect(schema.find(s=>s['@type']==='BlogPosting')).toMatchObject({headline:c.title,inLanguage:lang,about:{name:'Jacktools Clock'}});
  expect((await (await request.get('/sitemap.xml')).text())).toContain(post.path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
