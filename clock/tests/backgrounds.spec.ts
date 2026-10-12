import { test, expect, type Page } from '@playwright/test';
import { clockBackgrounds } from '../src/lib/clock-backgrounds';

async function choose(page: Page, value: string) {
  await page.locator('#trigger-background').click();
  const index = value === 'none' ? 0 : clockBackgrounds.indexOf(value as typeof clockBackgrounds[number]) + 1;
  await page.locator('#options-background [role=option]').nth(index).click();
}

test('all motifs have local previews and appear in both clock views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/de/');
  await expect(page.locator('#options-background [role=option]')).toHaveCount(13);
  for (const id of clockBackgrounds) {
    expect((await page.request.get(`/backgrounds/${id}.svg`)).ok()).toBeTruthy();
    await choose(page, id);
    await expect(page.locator('.clock-card')).toHaveAttribute('data-background', id);
    await expect(page.locator('#trigger-background img')).toHaveAttribute('src', `/backgrounds/${id}.svg`);
  }
  expect(await page.locator('.clock-card').evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain('/backgrounds/gradient.svg');
  expect(await page.locator('.clock-readout').evaluate(el => {
    const style = getComputedStyle(el);
    return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.padding === '0px';
  })).toBeTruthy();
  await page.locator('#clock-focus').click();
  expect(await page.locator('.clock-card').evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain('/backgrounds/gradient.svg');
  expect(await page.locator('.clock-readout').evaluate(el => {
    const style = getComputedStyle(el);
    return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.padding === '0px';
  })).toBeTruthy();
  await page.keyboard.press('Escape');
  await choose(page, 'none');
  await expect(page.locator('#trigger-background img')).toBeHidden();
  expect(await page.locator('.clock-card').evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
  await page.locator('#clock-focus').click();
  expect(await page.locator('.clock-card').evaluate(el => getComputedStyle(el, '::before').content)).toBe('none');
  expect(errors).toEqual([]);
});

test('selection is keyboard accessible and only persists with consent', async ({ page }) => {
  await page.goto('/de/');
  await page.locator('#trigger-background').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'gradient');
  expect(await page.evaluate(() => localStorage.getItem('jacktools.clock.settings.v1'))).toBeNull();
  await page.reload();
  await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'none');
  await choose(page, 'aurora');
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'aurora');
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').uncheck();
  expect(await page.evaluate(() => localStorage.getItem('jacktools.clock.settings.v1'))).toBeNull();
  await page.reload();
  await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'none');
});

test('unsupported saved backgrounds fall back safely', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jacktools.clock.storage-consent.v1', 'yes');
    localStorage.setItem('jacktools.clock.settings.v1', JSON.stringify({ background: 'https://example.com/image.svg', view: 'analogFlip' }));
  });
  await page.goto('/de/');
  await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'none');
  await expect(page.locator('.clock-display')).toHaveAttribute('data-view', 'analogFlip');
});

test('backgrounds fit all readouts in portrait and landscape', async ({ page }) => {
  await page.goto('/de/');
  await choose(page, 'aurora');
  // Exercise focus layout without changing the browser window's fullscreen state.
  for (const size of [{ width: 412, height: 915 }, { width: 915, height: 412 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const view of ['analog', 'digital', 'combined', 'flip', 'analogFlip']) {
      await page.evaluate(view => {
        document.body.classList.add('focus-view');
        const select = document.querySelector<HTMLSelectElement>('select[name=view]')!;
        select.value = view; select.dispatchEvent(new Event('change', { bubbles: true }));
      }, view);
      expect(await page.locator('.clock-display').evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1)).toBeTruthy();
      await expect(page.locator('.clock-readout')).toBeVisible();
    }
  }
});

for (const lang of ['en', 'es', 'fr']) {
  test(`background picker is available in ${lang}`, async ({ page }) => {
    await page.goto(`/${lang}/`);
    await expect(page.locator('#trigger-background')).toBeVisible();
    await choose(page, 'lake');
    await expect(page.locator('.clock-card')).toHaveAttribute('data-background', 'lake');
  });
}
