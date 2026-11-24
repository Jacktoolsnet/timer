import {test,expect} from '@playwright/test';

test('all dial views keep clock left and matching calendar right in phone landscape',async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
 await page.goto('/de/');
 for(const size of [{width:568,height:320},{width:667,height:375},{width:844,height:390},{width:915,height:412},{width:932,height:430},{width:1024,height:600}]) {
  await page.setViewportSize(size);
  let calendarWidth=0,calendarHeight=0;
  for(const [view,label,selector] of [['analog','Analog','#analog-clock'],['orbit','Orbit-Uhr','#orbit-clock'],['sundial','Sonnenuhr','#sundial-view']]) {
   // Select outside focus, as a user would; focus does not change fullscreen here.
   await page.evaluate(()=>document.body.classList.remove('focus-view'));
   await page.locator('#trigger-view').click();
   await page.getByRole('option',{name:label,exact:true}).click();
   await page.evaluate(()=>document.body.classList.add('focus-view'));
   const dial=await page.locator(selector).boundingBox();
   const calendar=await page.locator('.date-calendar').boundingBox();
   expect(dial,view).not.toBeNull();expect(calendar,view).not.toBeNull();
   expect(Math.abs(dial!.y+dial!.height/2-size.height/2),view).toBeLessThan(1);
   expect(dial!.x+dial!.width,view).toBeLessThan(calendar!.x);
   expect(dial!.x+dial!.width/2,view).toBeLessThan(size.width/2);
   expect(calendar!.x+calendar!.width/2,view).toBeGreaterThan(size.width/2);
   if(view==='analog'){calendarWidth=calendar!.width;calendarHeight=calendar!.height;}
   else {
    expect(Math.abs(calendar!.width-calendarWidth),view).toBeLessThan(1);
    expect(Math.abs(calendar!.height-calendarHeight),view).toBeLessThan(1);
   }
   for(const box of [dial!,calendar!]) {
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
   }
  }
 }
 // Returning to portrait must restore the stacked layout.
 await page.setViewportSize({width:390,height:844});
 const dial=await page.locator('#sundial-view').boundingBox();
 const calendar=await page.locator('.date-calendar').boundingBox();
 expect(dial!.y+dial!.height).toBeLessThanOrEqual(calendar!.y);
});
