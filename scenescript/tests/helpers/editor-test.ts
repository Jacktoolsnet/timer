import {test as base,expect} from '@playwright/test';
import {demoProject} from '../../src/lib/model';
import {DEFAULT_PROJECT_URL} from '../../src/lib/startup-project';
/** Legacy editor tests choose their small 2D fixture explicitly. Shipping startup has its own unmocked suite. */
export const test=base.extend({page:async({page},use)=>{
 await page.route('**'+DEFAULT_PROJECT_URL,route=>route.fulfill({contentType:'application/json',body:JSON.stringify(demoProject())}));await use(page);
}});
export {expect};
export type {Page} from '@playwright/test';
