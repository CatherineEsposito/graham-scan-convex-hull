import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convexHull, orientation, areCollinear } from '../src/index.js';

/** Wrap each hull point as a string for stable set comparison regardless of order. */
function hullAsSet(hull) {
  return new Set(hull.map(([x, y]) => `${x},${y}`));
}

function expectSameSet(actual, expected) {
  assert.equal(actual.length, expected.length,
    `length mismatch: got ${actual.length} expected ${expected.length}`);
  const a = hullAsSet(actual);
  const e = hullAsSet(expected);
 for (const p of e) {
    assert.ok(a.has(p), `missing ${p} in ${JSON.stringify([...a])}`);
  }
  for (const p of a) {
    assert.ok(e.has(p), `unexpected ${p}`);
  }
}

/**
 * Assert hull is counter-clockwise. A strict convex polygon has every triple
 * (prev, cur, next) turning left (orientation +1). We check each vertex.
 */
function assertCounterClockwise(hull) {
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const prev = hull[(i - 1 + n) % n];
    const cur = hull[i];
    const next = hull[(i + 1) % n];
    assert.equal(orientation(prev, cur, next), 1,
      `non-CCW vertex at ${i}: ${JSON.stringify(prev)} -> ${JSON.stringify(cur)} -> ${JSON.stringify(next)}`);
  }
}

// --- orientation primitive -------------------------------------------

test('orientation: CCW turn is +1', () => {
  assert.equal(orientation([0, 0], [1, 0], [0, 1]), 1);
});

test('orientation: clockwise turn is -1', () => {
  assert.equal(orientation([0, 0], [0, 1], [1, 0]), -1);
});

test('orientation: collinear is 0', () => {
  assert.equal(orientation([0, 0], [1, 0], [2, 0]), 0);
  assert.equal(areCollinear([0, 0], [1, 0], [2, 0]), true);
});

// --- degenerate inputs -----------------------------------------------

test('empty input returns empty array', () => {
  assert.deepEqual(convexHull([]), []);
});

test('single point returns itself', () => {
  assert.deepEqual(convexHull([[5, 7]]), [[5, 7]]);
});

test('two distinct points returns both', () => {
  const out = convexHull([[0, 0], [3, 4]]);
  assert.equal(out.length, 2);
  expectSameSet(out, [[0, 0], [3, 4]]);
});

test('two identical points collapse to one', () => {
  assert.deepEqual(convexHull([[2, 2], [2, 2]]), [[2, 2]]);
});

test('all points collinear returns only the two extremes', () => {
  const out = convexHull([[0, 0], [1, 1], [2, 2], [3, 3], [-2, -2]]);
  assert.equal(out.length, 2);
  expectSameSet(out, [[-2, -2], [3, 3]]);
});

test('all points identical returns single point', () => {
  assert.deepEqual(convexHull([[1, 1], [1, 1], [1, 1]]), [[1, 1]]);
});

test('duplicate points among a real hull are deduplicated', () => {
  const pts = [[0, 0], [4, 0], [0, 4], [0, 0], [4, 0]];
  const out = convexHull(pts);
  assert.equal(out.length, 3);
  expectSameSet(out, [[0, 0], [4, 0], [0, 4]]);
});

// --- real hulls --------------------------------------------------------

test('unit square hull is the four corners, CCW', () => {
  const out = convexHull([[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]);
  expectSameSet(out, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  assertCounterClockwise(out);
});

test('points inside a triangle are excluded', () => {
  const out = convexHull([
    [0, 0], [10, 0], [5, 10],
    [5, 1], [4, 4], [6, 2]
  ]);
  expectSameSet(out, [[0, 0], [10, 0], [5, 10]]);
  assertCounterClockwise(out);
});

test('square with collinear edge points drops the intermediates', () => {
  const out = convexHull([
    [0, 0], [2, 0], [1, 0],
    [0, 2], [2, 2],
    [0, 1]
  ]);
  expectSameSet(out, [[0, 0], [2, 0], [2, 2], [0, 2]]);
  assert.equal(out.length, 4);
  assertCounterClockwise(out);
});

test('rightward horizontal ray keeps only the farthest', () => {
  // anchor is [0,0]; everything else is along y=0 to the right
  const out = convexHull([[0, 0], [1, 0], [2, 0], [3, 0]]);
  expectSameSet(out, [[0, 0], [3, 0]]);
  assert.equal(out.length, 2);
});

test('non-convex cluster yields correct CCW hull', () => {
  const pts = [
    [0, 0], [5, 0], [5, 5], [0, 5],
    [2, 2], [3, 1], [1, 3], [4, 4],
    [5, 1], [1, 5]
  ];
  const out = convexHull(pts);
  expectSameSet(out, [[0, 0], [5, 0], [5, 5], [0, 5]]);
  assertCounterClockwise(out);
});

test('hexagon with interior clutter', () => {
  const hex = [
    [3, 0], [6, 2], [6, 5], [3, 7], [0, 5], [0, 2]
  ];
  const interior = [
    [3, 3], [2, 4], [4, 4], [3, 5], [1, 3]
  ];
  const out = convexHull([...hex, ...interior]);
  expectSameSet(out, hex);
  assertCounterClockwise(out);
});

test('hull output starts at the lexicographically smallest (y, then x) point', () => {
  // smallest y is 0; among y=0 the smallest x is 0 -> [0,0]
  const out = convexHull([[1, 1], [2, 0], [0, 0], [0, 2], [2, 2]]);
  assert.deepEqual(out[0], [0, 0]);
});

test('negative coordinates handled correctly', () => {
  const pts = [[-2, -2], [2, -2], [2, 2], [-2, 2], [0, 0]];
  const out = convexHull(pts);
  expectSameSet(out, [[-2, -2], [2, -2], [2, 2], [-2, 2]]);
  assertCounterClockwise(out);
});

// --- input validation -------------------------------------------------

test('non-array input throws TypeError', () => {
  assert.throws(() => convexHull('nope'), TypeError);
  assert.throws(() => convexHull(null), TypeError);
});

test('malformed point throws TypeError', () => {
  assert.throws(() => convexHull([[1, 2], [3]]), TypeError);
  assert.throws(() => convexHull([[1, 2], ['x', 3]]), TypeError);
  assert.throws(() => convexHull([[1, 2], [3, NaN]]), TypeError);
  assert.throws(() => convexHull([[1, 2], [3, Infinity]]), TypeError);
});
