import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLibrary } from '../src/lib/scripts.ts';
import { startCountdown } from '../src/lib/countdown.ts';
import { keepScreenAwake } from '../src/lib/wakeLock.ts';

test('an existing saved speech becomes the first script without losing empty text', () => {
  assert.equal(parseLibrary(null, 'Mi discurso').scripts[0].text, 'Mi discurso');
  assert.equal(parseLibrary(null, '').scripts[0].text, '');
  const raw = '{"activeId":"b","scripts":[{"id":"a","name":"Uno","text":"A"},{"id":"b","name":"Dos","text":"B"}]}';
  assert.equal(parseLibrary(raw, 'legacy').activeId, 'b');
  assert.equal(parseLibrary(raw, 'legacy').scripts[1].text, 'B');
});

test('corrupt or invalid library falls back to the old speech', () => {
  for (const raw of ['{', '{}', '{"activeId":"a","scripts":[]}', '{"activeId":"a","scripts":[{"id":"a","text":12}]}']) {
    assert.equal(parseLibrary(raw, 'Recuperado').scripts[0].text, 'Recuperado');
  }
});

test('countdown waits three seconds and cancellation prevents playback', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const ticks = [];
  let starts = 0;
  const cancel = startCountdown(value => ticks.push(value), () => starts++);
  assert.equal(ticks[0], 3);
  t.mock.timers.tick(2000);
  assert.equal(starts, 0);
  cancel();
  t.mock.timers.tick(2000);
  assert.equal(starts, 0);
  startCountdown(value => ticks.push(value), () => starts++);
  t.mock.timers.tick(3000);
  assert.equal(starts, 1);
  assert.equal(ticks.at(-1), 0);
});

function fakePage() {
  const page = new EventTarget();
  page.visibilityState = 'visible';
  return page;
}

function sentinel() {
  const lock = new EventTarget();
  lock.released = false;
  lock.release = async () => { lock.released = true; lock.dispatchEvent(new Event('release')); };
  return lock;
}

test('wake lock follows visibility and releases when reading stops', async () => {
  const page = fakePage();
  const locks = [];
  const stop = keepScreenAwake({ request: async () => { const lock = sentinel(); locks.push(lock); return lock; } }, page);
  await Promise.resolve();
  assert.equal(locks.length, 1);
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(locks[0].released, true);
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  assert.equal(locks.length, 2);
  stop();
  assert.equal(locks[1].released, true);
});

test('a wake lock arriving after cancellation is immediately released', async () => {
  const page = fakePage();
  let resolve;
  const stop = keepScreenAwake({ request: () => new Promise(done => { resolve = done; }) }, page);
  stop();
  const lock = sentinel();
  resolve(lock);
  await Promise.resolve();
  assert.equal(lock.released, true);
});

test('unsupported or denied wake lock leaves reading usable', async () => {
  keepScreenAwake(undefined, fakePage())();
  const stop = keepScreenAwake({ request: async () => { throw new Error('denied'); } }, fakePage());
  await Promise.resolve();
  stop();
});
