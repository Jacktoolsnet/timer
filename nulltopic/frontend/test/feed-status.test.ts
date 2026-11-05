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
