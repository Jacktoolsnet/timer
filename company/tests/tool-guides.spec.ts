import { test, expect } from '@playwright/test';
import { toolGuides } from '../src/lib/tool-guides';

test.beforeEach(async ({page}) => {
  // Do not request real advertisements or third-party assets during tests.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname) ? route.continue() : route.fulfill({contentType:'application/javascript',body:''});
  });
});

for (const guide of toolGuides) {
  test(`${guide.slug}: homepage link, content, images, gallery and print`, async ({page}, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/de/');
    await page.getByRole('link', {name:`${guide.name} kennenlernen: Anleitung & Beispiele`,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/de/tools/${guide.slug}/$`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(guide.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://jacktools.net/de/tools/${guide.slug}/`);
    await expect(page.locator('link[hreflang]')).toHaveCount(0);
    await expect(page.locator('.site-header .guide-header-action')).toHaveAttribute('href',guide.url);
    for (const anchor of await page.locator('.guide-toc a').all()) {
      await expect(page.locator((await anchor.getAttribute('href'))!)).toHaveCount(1);
    }
    const image = page.locator('.tool-screenshot img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((el:HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await image.click();
    const gallery = page.getByRole('dialog',{name:'Bildergalerie'});
    await expect(gallery).toBeVisible();
    await expect(gallery.locator('img')).toHaveAttribute('alt',(await image.getAttribute('alt'))!);
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden();
    const ad = page.locator('.company-ad');
    await ad.locator('ins').evaluate(el=>el.setAttribute('data-ad-status','unfilled'));
    await expect(ad).toBeHidden();
    await ad.locator('ins').evaluate(el=>el.setAttribute('data-ad-status','filled'));
    await expect(ad.locator('p')).toBeVisible();
    await ad.locator('ins').evaluate(el=>el.setAttribute('data-ad-status','unfilled'));
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`/tmp/guide-${guide.slug}-${info.project.name}.png`,fullPage:true});
    await page.evaluate(()=>{document.documentElement.dataset.fontSize='3';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.emulateMedia({media:'print'});
    await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    await expect(page.locator('.tool-guide details:not([open])')).toHaveCount(0);
    await expect(image).toBeHidden();
    await expect(ad).toBeHidden();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.guide-toc')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.tool-guide details:not([open])')).toHaveCount(guide.faq.length-1);
    const sitemap = await page.request.get('/sitemap.xml');
    expect(await sitemap.text()).toContain(`<loc>https://jacktools.net/de/tools/${guide.slug}/</loc>`);
    expect(errors).toEqual([]);
  });
}

test.describe('static content without JavaScript',()=>{
  test.use({javaScriptEnabled:false});
  test('guides are complete and main-page links are German-only',async({page})=>{
    for (const guide of toolGuides) {
      await page.goto(`/de/tools/${guide.slug}/`);
      await expect(page.locator('h1')).toHaveText(guide.title);
      await expect(page.locator('.tool-guide section')).toHaveCount(guide.sections.length+2);
      await expect(page.locator('.tool-screenshot a')).toHaveAttribute('href',/\.(png|svg)$/);
    }
    await page.goto('/en/');
    await expect(page.locator('a[href^="/de/tools/"]')).toHaveCount(0);
  });
});


test('all homepage tool cards have matching primary and secondary button widths', async ({page}) => {
  await page.goto('/de/');
  for (const group of await page.locator('.timer-card-actions').all()) {
    const widths = await group.locator('a').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().width));
    expect(widths).toHaveLength(2);
    expect(Math.abs(widths[0]-widths[1])).toBeLessThan(1);
  }
});
