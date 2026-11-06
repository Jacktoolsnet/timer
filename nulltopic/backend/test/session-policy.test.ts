import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessionDeadline, SESSION_IDLE_MS, SESSION_ABSOLUTE_MS} from '../src/session-policy.js';

test('both roles have a 30 minute idle deadline capped at eight hours from login', () => {
  const now = 10 * SESSION_ABSOLUTE_MS;
  for (const identity of [{operatorId:'operator'}, {adminId:'admin'}]) {
    const data = {...identity, authenticatedAt:now};
    assert.equal(sessionDeadline(data, now), now + SESSION_IDLE_MS);
    assert.equal(sessionDeadline(data, now + SESSION_IDLE_MS), now + 2 * SESSION_IDLE_MS);
    assert.equal(sessionDeadline(data, now + SESSION_ABSOLUTE_MS - 1), now + SESSION_ABSOLUTE_MS);
    assert.equal(sessionDeadline(data, now + SESSION_ABSOLUTE_MS), null);
    assert.equal(sessionDeadline(data, now + SESSION_ABSOLUTE_MS + 1), null);
  }
});
test('legacy or invalid login timestamps cannot extend authenticated sessions', () => {
  for (const identity of [{operatorId:'operator'}, {adminId:'admin'}]) {
    for (const authenticatedAt of [undefined, NaN, Infinity, 1001]) {
      assert.equal(sessionDeadline({...identity,authenticatedAt},1000),null);
    }
  }
  assert.equal(sessionDeadline({},1000),1000+SESSION_IDLE_MS);
});
