import assert from 'node:assert/strict';
import { estimateWordTimestamps } from './estimateWordTimestamps.js';

const T = 1_000_000; // recStartMs baseline

function run(label, fn) {
  fn();
  console.log('✓', label);
}

run('all words interim-anchored', () => {
  const snapshots = [
    { words: ['hello'], arrivalMs: T + 1000 },
    { words: ['hello', 'world'], arrivalMs: T + 2000 },
  ];
  const result = estimateWordTimestamps(snapshots, ['hello', 'world'], T);
  assert.equal(result.length, 2);
  assert.equal(result[0].source, 'interim');
  assert.equal(result[1].source, 'interim');
  assert.equal(result[0].word, 'hello');
  assert.equal(result[0].offsetMs, 1000);
  assert.equal(result[1].offsetMs, 2000);
});

run('trailing words get fallback with 150ms spacing', () => {
  const snapshots = [{ words: ['one'], arrivalMs: T + 1000 }];
  const result = estimateWordTimestamps(snapshots, ['one', 'two', 'three'], T);
  assert.equal(result[0].source, 'interim');
  assert.equal(result[1].source, 'fallback');
  assert.equal(result[2].source, 'fallback');
  assert.equal(result[1].offsetMs, 1150);
  assert.equal(result[2].offsetMs, 1300);
});

run('empty snapshots all fallback, offsetMs >= 0', () => {
  const result = estimateWordTimestamps([], ['a', 'b'], T);
  assert.equal(result[0].source, 'fallback');
  assert.equal(result[1].source, 'fallback');
  assert.ok(result[0].offsetMs >= 0);
  assert.ok(result[1].offsetMs >= 0);
});

run('empty snapshots with arrivalMs uses it as anchor', () => {
  const result = estimateWordTimestamps([], ['a', 'b'], T, { arrivalMs: T + 5000 });
  assert.equal(result[0].offsetMs, 5150);
  assert.equal(result[1].offsetMs, 5300);
});

run('single word, no off-by-one', () => {
  const snapshots = [{ words: ['solo'], arrivalMs: T + 1500 }];
  const result = estimateWordTimestamps(snapshots, ['solo'], T);
  assert.equal(result.length, 1);
  assert.equal(result[0].source, 'interim');
  assert.equal(result[0].offsetMs, 1500);
});

run('offsetMs never negative (arrivalMs before recStartMs)', () => {
  const snapshots = [{ words: ['hi'], arrivalMs: T - 100 }];
  const result = estimateWordTimestamps(snapshots, ['hi'], T);
  assert.ok(result[0].offsetMs >= 0);
});

run('custom fallbackIntervalMs is respected', () => {
  const snapshots = [{ words: ['first'], arrivalMs: T + 1000 }];
  const result = estimateWordTimestamps(snapshots, ['first', 'second'], T, { fallbackIntervalMs: 300 });
  assert.equal(result[1].offsetMs, 1300);
});

run('Android path (empty snapshots) all fallback', () => {
  const result = estimateWordTimestamps([], ['android', 'word'], T, { arrivalMs: T + 3000 });
  assert.equal(result[0].source, 'fallback');
  assert.equal(result[1].source, 'fallback');
});

console.log('\nAll tests passed.');
