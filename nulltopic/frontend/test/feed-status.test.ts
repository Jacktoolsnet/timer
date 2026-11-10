import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setFeedStatus, type FeedState } from '../src/scripts/feed-status';

test('stream connection states have distinct labels, styling hooks and explanatory tooltips', () => {
  const dom = new JSDOM('<span role="status" aria-atomic="true"></span>');
  const target = dom.window.document.querySelector('span')!;
  const cases: [FeedState, string][] = [['connecting', 'Connecting…'], ['live', 'Live'], ['reconnecting', 'Reconnecting…'], ['offline', 'Offline'], ['error', 'Update failed']];
  for (const [state, label] of cases) {
    setFeedStatus(target, state);
    assert.equal(target.dataset.state, state);
    assert.equal(target.textContent, label);
    assert.ok(target.title.length > label.length);
  }
  dom.window.close();
});

test('header status popover keeps its controls while all localized connection states update', async () => {
  const {readFileSync} = await import('node:fs');
  const {initializeFeedStatus} = await import('../src/scripts/feed-status');
  const {translate} = await import('../src/lib/i18n');
  const html = readFileSync(new URL('../dist/conversations/index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, {url: 'http://localhost/conversations'});
  const saved = ['window','document'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  Object.defineProperty(globalThis,'window',{configurable:true,value:dom.window});
  Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
  try {
    const doc=dom.window.document, panel=doc.querySelector<HTMLDetailsElement>('#live')!, trigger=panel.querySelector('summary')!;
    const appearance=doc.querySelector<HTMLDetailsElement>('#appearance-settings')!;
    assert.equal(panel.parentElement, appearance.parentElement);
    assert.deepEqual([...panel.parentElement!.querySelectorAll('details')].map(node=>node.id),['appearance-settings','live']);
    assert.equal(doc.querySelector('.stream-subheader #live'),null);
    initializeFeedStatus(panel);
    for(const language of ['en','de','es','fr'] as const) {
      doc.documentElement.lang=language;
      for(const state of ['connecting','live','reconnecting','offline','error'] as const) {
        panel.open=true; trigger.focus(); setFeedStatus(panel,state);
        assert.equal(panel.open,true); assert.equal(doc.activeElement,trigger);
        const label=panel.querySelector('[data-live-label]')!.textContent!;
        assert.equal(trigger.getAttribute('aria-label'),translate('Live updates',language)+': '+label);
        assert.ok(panel.querySelector('[data-live-description]')!.textContent!.length>label.length);
        assert.ok(panel.querySelector('[data-live-close]'));
        assert.ok(trigger.querySelector('.live-status-dot'));
      }
    }
    appearance.open=true;panel.open=false;await new Promise(r=>setTimeout(r,0));panel.open=true;await new Promise(r=>setTimeout(r,0));
    assert.equal(appearance.open,false);
    panel.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(panel.open,false);assert.equal(doc.activeElement,trigger);
    panel.open=true;panel.querySelector<HTMLButtonElement>('[data-live-close]')!.click();assert.equal(panel.open,false);
    panel.open=true;doc.body.click();assert.equal(panel.open,false);
    panel.open=true;trigger.focus();appearance.querySelector<HTMLElement>('summary')!.focus();assert.equal(panel.open,false);
    assert.ok(new JSDOM(readFileSync(new URL('../dist/agents/index.html',import.meta.url),'utf8')).window.document.querySelector('#live'));
  } finally {
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    for(const [key,value] of saved)if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);
    dom.window.close();
  }
});
