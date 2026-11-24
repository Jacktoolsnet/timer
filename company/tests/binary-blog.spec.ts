import {test,expect} from '@playwright/test';
import {getBlogPath,getBlogPost} from '../src/lib/blog';
import copy from '../src/lib/binary-blog.json' with {type:'json'};
import {readFileSync} from 'node:fs';

test('original SVG diagrams accurately encode each digit of 14:25:36',()=>{
 for(const lang of ['de','en','es','fr'] as const){
  const svg=readFileSync(new URL(`../public/images/blog/binary/read-${lang}.svg`,import.meta.url),'utf8');
  expect(svg).toContain('<title');expect(svg).toContain('<desc');expect(svg).not.toMatch(/<script|<image/);
  const circles=[...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="22" fill="([^"]+)"/g)];
  expect(circles).toHaveLength(24);
  const values=[1,4,2,5,3,6];
  for(let col=0;col<6;col++){
   const x=230+Math.floor(col/2)*230+col%2*80;
   const decoded=circles.filter(c=>Number(c[1])===x&&c[3]==='#567d3e').reduce((sum,c)=>sum+[8,4,2,1][(Number(c[2])-170)/80],0);
   expect(decoded).toBe(values[col]);
  }
 }
});
for(const lang of ['de','en','es','fr'] as const)test(`${lang}: binary article is discoverable, localized and illustrated without screenshots`,async({page,request},info)=>{
 await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
 await page.goto(`/${lang}/`);await page.locator('.blog-home .blog-post-card').click();
 const post=getBlogPost(lang,'binary');await expect(page).toHaveURL(new RegExp(post.path+'$'));await expect(page.locator('h1')).toHaveText(post.title);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://jacktools.net'+post.path);
 for(const other of ['de','en','es','fr'] as const)await expect(page.locator(`link[hreflang="${other}"]`)).toHaveAttribute('href','https://jacktools.net'+getBlogPath(other,'binary'));
 await expect(page.locator('.article-body section')).toHaveCount(4);await expect(page.locator('#digits')).toContainText('BCD');await expect(page.locator('#read')).toContainText('14:25:36');
 for(const [id,title,text] of copy[lang].sections){await expect(page.locator(`#${id} h2`)).toHaveText(title);await expect(page.locator(`#${id}`)).toContainText(text);}
 const images=page.locator('.article-cover img,.article-diagram img');await expect(images).toHaveCount(2);
 for(const image of await images.all()){
  await image.scrollIntoViewIfNeeded();await expect(image).toHaveAttribute('src',new RegExp(`-${lang}\\.svg$`));await expect(image).not.toHaveAttribute('alt','');
  await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth===1000)).toBe(true);
 }
 await expect(page.locator(`.article-body a[href="https://clock.jacktools.net/${lang}/"]`)).toHaveCount(1);
 expect((await request.get('/sitemap.xml')).ok()).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(lang==='de')await page.screenshot({path:`/tmp/binary-blog-${info.project.name}.png`,fullPage:true});
});
