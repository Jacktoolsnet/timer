import {test,expect} from '@playwright/test';
for(const lang of ['de','en','es','fr'])test(`project, recording setup and format actions are visually distinct: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 const dialog=page.locator('#files-dialog'),project=dialog.locator('.file-project'),setup=dialog.locator('#recording-options'),formats=dialog.locator('.recording-formats');
 await expect(project.locator('#json-export')).toBeVisible();await expect(project.locator('#json-import')).toBeVisible();
 await expect(project.locator('.file-type-badge')).toHaveText('JSON');
 await expect(setup.locator('[role=switch]')).toHaveCount(3);
 await expect(dialog.locator('.recording-format')).toHaveCount(2);
 await expect(dialog.locator('.recording-format #wav-record')).toHaveCount(1);
 await expect(dialog.locator('.recording-format #video-record')).toHaveCount(1);
 const p=(await project.boundingBox())!,s=(await setup.boundingBox())!,f=(await formats.boundingBox())!;
 expect(s.y).toBeGreaterThan(p.y+p.height);expect(f.y).toBeGreaterThan(s.y+s.height);
 for(const detail of await dialog.locator('.file-details').all())await expect(detail).not.toHaveAttribute('open');
 const wav=(await dialog.locator('.recording-format').nth(0).boundingBox())!,mp4=(await dialog.locator('.recording-format').nth(1).boundingBox())!;
 if(test.info().project.name==='desktop')expect(Math.abs(wav.y-mp4.y)).toBeLessThan(2);
 else expect(mp4.y).toBeGreaterThan(wav.y+wav.height);
 await page.locator('#video-record').scrollIntoViewIfNeeded();await expect(page.locator('#files-close')).toBeInViewport();
 if(lang==='de'){
  await dialog.evaluate(d=>d.scrollTop=0);
  await dialog.screenshot({path:'test-results/files-layout-'+test.info().project.name+'.png'});
 }
 await page.locator('#files-close').click();await expect(dialog).toBeHidden();
});
