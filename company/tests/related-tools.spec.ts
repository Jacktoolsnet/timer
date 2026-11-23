import {test,expect} from '@playwright/test';
const slugs=['timer','clock','stopwatch','calculator','breathe','relax','metronome','messagedrop'];
test.beforeEach(async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,route=>route.fulfill({body:''}));
});
for(const slug of slugs){
 test(`${slug}: consistent related-tool cards, responsive and print-safe`,async({page})=>{
  await page.goto(`/de/tools/${slug}/`);
  const nav=page.getByRole('navigation',{name:'Weitere Tools kennenlernen'});
  await expect(nav).toBeVisible();
  await expect(nav.locator('.related-card')).toHaveCount(8);
  await expect(nav.locator(`a[href="/de/tools/${slug}/"]`)).toHaveCount(0);
  for(const other of slugs.filter(s=>s!==slug)){
   const card=nav.locator(`a[href="/de/tools/${other}/"]`);
   await expect(card.locator('.related-icon svg, .related-icon img')).toHaveCount(1);
   await expect(card.locator('.related-description')).not.toBeEmpty();
   await expect(card.locator('.related-action')).toHaveText('Anleitung ansehen');
  }
  await page.evaluate(()=>{
   document.documentElement.style.setProperty('--font-scale','1.3');
   document.documentElement.setAttribute('data-theme','dark');
  });
  const bounds=await nav.locator('.related-card').evaluateAll(cards=>cards.map(c=>{
   const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
  }));
  for(const box of bounds){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual((page.viewportSize()!.width)+1);}
  expect(Math.max(...bounds.map(b=>b.width))-Math.min(...bounds.map(b=>b.width))).toBeLessThan(1);
  await nav.locator('.related-card').first().focus();
  await expect(nav.locator('.related-card').first()).toBeFocused();
  await page.emulateMedia({media:'print'});
  await expect(nav).toBeHidden();
 });
}
