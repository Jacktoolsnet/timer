import {test as base,expect} from '@playwright/test';
import {demoProject} from '../../src/lib/model';
import {DEFAULT_PROJECT_URL} from '../../src/lib/startup-project';
/** Legacy editor tests choose their small 2D fixture explicitly. Wait for async boot before programmatic input; shipping startup has its own unmocked suite. */
export const test=base.extend({page:async({page},use)=>{
 await page.route('**'+DEFAULT_PROJECT_URL,route=>route.fulfill({contentType:'application/json',body:JSON.stringify(demoProject())}));
 const ready=async()=>{if(await page.locator('#editor').count())await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');};
 const goto=page.goto.bind(page),reload=page.reload.bind(page);
 page.goto=async(url,options)=>{const response=await goto(url,options);await ready();return response;};
 page.reload=async(options)=>{const response=await reload(options);await ready();return response;};
 await use(page);
}});
export {expect};
export type {Page} from '@playwright/test';
