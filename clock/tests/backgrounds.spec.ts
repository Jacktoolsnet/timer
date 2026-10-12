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

test('transparency updates surfaces live, keeps text visible and follows consent', async ({ page }) => {
  await page.goto('/de/');
  const slider = page.locator('#clock-transparency');
  await expect(slider).toBeHidden();
  await expect(slider).toBeDisabled();
  await choose(page, 'aurora');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
  await expect(page.locator('#clock-transparency-value')).toHaveText('100 %');
  expect(await page.locator('.clock-card').evaluate(el => el.style.getPropertyValue('--clock-surface-opacity'))).toBe('0%');
  expect(await page.locator('#clock-zone').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await page.evaluate(() => localStorage.getItem('jacktools.clock.settings.v1'))).toBeNull();
  await choose(page, 'none');
  await expect(slider).toBeHidden();
  expect(await page.locator('.clock-card').evaluate(el => el.style.getPropertyValue('--clock-surface-opacity'))).toBe('100%');
  await choose(page, 'aurora');
  await expect(slider).toHaveValue('100');
  expect(await page.locator('.clock-card').evaluate(el => el.style.getPropertyValue('--clock-surface-opacity'))).toBe('0%');
  await page.locator('#palette-dropdown summary').click();
  await page.locator('#remember-preferences').check();
  await page.reload();
  await expect(slider).toHaveValue('100');
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#clock-transparency-value')).toHaveText('0 %');
  expect(await page.locator('.clock-card').evaluate(el => el.style.getPropertyValue('--clock-surface-opacity'))).toBe('100%');
});

test('animated flip leaves do not stack translucent backgrounds', async ({ page }) => {
  await page.goto('/de/');
  await choose(page, 'aurora');
  await page.evaluate(async () => {
    const slider = document.querySelector<HTMLInputElement>('#clock-transparency')!;
    slider.value = '50'; slider.dispatchEvent(new Event('input', { bubbles: true }));
    const select = document.querySelector<HTMLSelectElement>('select[name=view]')!;
    select.value = 'flip'; select.dispatchEvent(new Event('change', { bubbles: true }));
    // Detached from the live clock, but inside its card to use the same styling.
    const root = document.createElement('div'); root.id = 'test-flaps';
    document.querySelector('.clock-card')!.append(root);
    const modulePath = '/src/scripts/flip-clock.ts';
    const { createFlipClock } = await import(modulePath);
    const update = createFlipClock(root);
    update([{ type: 'second', value: '09' }], false);
    update([{ type: 'second', value: '10' }], true);
    root.querySelectorAll('*').forEach(el => el.getAnimations().forEach(animation => animation.pause()));
  });
  await expect(page.locator('#test-flaps .flip-moving')).toHaveCount(4);
  expect(await page.locator('#test-flaps .flip-half').evaluateAll(elements => elements.every(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'))).toBeTruthy();
  const surface = await page.locator('#test-flaps .flip-digit').first().evaluate(el => getComputedStyle(el, '::before').backgroundColor);
  expect(surface).toContain('0.5');
  expect(await page.locator('#test-flaps .flip-moving').first().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  const outgoing = page.locator('#test-flaps .flip-outgoing-glyph').first();
  await outgoing.evaluate(el => { el.getAnimations()[0].currentTime = 389; });
  expect(await outgoing.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await outgoing.evaluate(el => { el.getAnimations()[0].currentTime = 390; });
  expect(await outgoing.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  await page.locator('#test-flaps .flip-moving.flip-bottom').evaluateAll(elements => elements.forEach(el => el.dispatchEvent(new Event('animationend'))));
  await expect(page.locator('#test-flaps .flip-outgoing-glyph')).toHaveCount(0);
  expect(await page.locator('#test-flaps .flip-bottom > span').allTextContents()).toEqual(['1', '0']);
  await choose(page, 'none');
  await expect(page.locator('.clock-card')).toHaveAttribute('data-transparent-flaps', 'false');
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
