import type {Page} from '@playwright/test';
export async function openResources(page:Page){if(!await page.locator('#resources-dialog').isVisible())await page.locator('#open-resources').click();}
export async function closeResources(page:Page){if(await page.locator('#resources-dialog').isVisible())await page.locator('#close-resources').click();}
