import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timer, defaults, formatTime, sanitizeSettings } from '../src/lib/engine.ts';

test('countdown uses a deadline and completes once after a background delay', () => {
  const timer = new Timer('timer', { ...defaults, countdown: 60 });
  timer.start(1000);
  assert.equal(timer.tick(31000), false);
  assert.equal(timer.remaining, 30000);
  assert.equal(timer.tick(120000), true);
  assert.equal(timer.remaining, 0);
  assert.equal(timer.tick(130000), false);
});
test('pause and resume preserve the remaining duration', () => {
  const timer = new Timer('timer', defaults);
  timer.start(1000); timer.pause(31000);
  assert.equal(timer.remaining, 270000);
  timer.start(500000);
  assert.equal(timer.deadline, 770000);
  timer.tick(600000);
  assert.equal(timer.remaining, 170000);
  timer.reset();
  assert.equal(timer.remaining, 300000);
  assert.equal(timer.deadline, null);
});
test('pomodoro cycles through short breaks then a long break and resets rounds', () => {
  const timer = new Timer('pomodoro', defaults);
  for (let round = 1; round <= 4; round++) {
    assert.equal(timer.phase, 'focus');
    assert.equal(timer.round, round);
    assert.equal(timer.total, 25 * 60000);
    timer.next();
    assert.equal(timer.phase, round === 4 ? 'long' : 'short');
    assert.equal(timer.total, (round === 4 ? 15 : 5) * 60000);
    assert.equal(timer.deadline, null);
    timer.next();
  }
  assert.equal(timer.round, 1);
  assert.equal(timer.phase, 'focus');
});
test('completed phases wait instead of silently advancing', () => {
  const timer = new Timer('pomodoro', defaults);
  timer.start(0);
  assert.equal(timer.tick(1e9), true);
  assert.equal(timer.phase, 'focus');
  assert.equal(timer.round, 1);
  assert.equal(timer.deadline, null);
});
test('formatting supports hours, rounding and zero', () => {
  assert.equal(formatTime(1), '00:01');
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(-100), '00:00');
  assert.equal(formatTime(3661000), '01:01:01');
  assert.equal(formatTime(359999000), '99:59:59');
});
test('malformed persisted data cannot create invalid timer durations', () => {
  assert.deepEqual(sanitizeSettings(null), defaults);
  assert.deepEqual(sanitizeSettings({ countdown: -1, focus: Infinity, short: '5', rounds: 1.5, dark: 'true' }), defaults);
  assert.equal(sanitizeSettings({ countdown: 1, rounds: 12, dark: true }).countdown, 1);
});
test('one-round pomodoro has a long break immediately', () => {
  const timer = new Timer('pomodoro', { ...defaults, rounds: 1 });
  timer.next();
  assert.equal(timer.phase, 'long');
  timer.next();
  assert.equal(timer.round, 1);
});
