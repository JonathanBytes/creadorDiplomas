import test from 'node:test';
import assert from 'node:assert/strict';

import { createPageFrame, normalizeRotation, toPdfPoint } from './pageGeometry.js';

const CROP_BOX = { x: 10, y: 20, width: 200, height: 100 };

function assertPoint(actual, expected, label) {
  assert.ok(
    Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9,
    `${label}: expected (${expected.x}, ${expected.y}), got (${actual.x}, ${actual.y})`,
  );
}

function corners(frame) {
  return {
    topLeft: toPdfPoint(frame, 0, 0),
    topRight: toPdfPoint(frame, frame.width, 0),
    bottomLeft: toPdfPoint(frame, 0, frame.height),
    bottomRight: toPdfPoint(frame, frame.width, frame.height),
  };
}

test('normalizeRotation maps arbitrary angles to 0/90/180/270', () => {
  assert.equal(normalizeRotation(0), 0);
  assert.equal(normalizeRotation(-90), 270);
  assert.equal(normalizeRotation(360), 0);
  assert.equal(normalizeRotation(450), 90);
  assert.equal(normalizeRotation(89), 90);
  assert.equal(normalizeRotation(NaN), 0);
  assert.equal(normalizeRotation(undefined), 0);
});

test('rotation 0 maps display coordinates to PDF user space', () => {
  const frame = createPageFrame(CROP_BOX, 0);
  assert.equal(frame.width, 200);
  assert.equal(frame.height, 100);

  const c = corners(frame);
  assertPoint(c.topLeft, { x: 10, y: 120 }, 'topLeft');
  assertPoint(c.topRight, { x: 210, y: 120 }, 'topRight');
  assertPoint(c.bottomLeft, { x: 10, y: 20 }, 'bottomLeft');
  assertPoint(c.bottomRight, { x: 210, y: 20 }, 'bottomRight');
});

test('rotation 90 swaps displayed dimensions', () => {
  const frame = createPageFrame(CROP_BOX, 90);
  assert.equal(frame.width, 100);
  assert.equal(frame.height, 200);

  const c = corners(frame);
  assertPoint(c.topLeft, { x: 10, y: 20 }, 'topLeft');
  assertPoint(c.topRight, { x: 10, y: 120 }, 'topRight');
  assertPoint(c.bottomLeft, { x: 210, y: 20 }, 'bottomLeft');
  assertPoint(c.bottomRight, { x: 210, y: 120 }, 'bottomRight');
});

test('rotation 180 flips both axes', () => {
  const frame = createPageFrame(CROP_BOX, 180);
  assert.equal(frame.width, 200);
  assert.equal(frame.height, 100);

  const c = corners(frame);
  assertPoint(c.topLeft, { x: 210, y: 20 }, 'topLeft');
  assertPoint(c.topRight, { x: 10, y: 20 }, 'topRight');
  assertPoint(c.bottomLeft, { x: 210, y: 120 }, 'bottomLeft');
  assertPoint(c.bottomRight, { x: 10, y: 120 }, 'bottomRight');
});

test('rotation 270 swaps displayed dimensions and flips both axes', () => {
  const frame = createPageFrame(CROP_BOX, 270);
  assert.equal(frame.width, 100);
  assert.equal(frame.height, 200);

  const c = corners(frame);
  assertPoint(c.topLeft, { x: 210, y: 120 }, 'topLeft');
  assertPoint(c.topRight, { x: 210, y: 20 }, 'topRight');
  assertPoint(c.bottomLeft, { x: 10, y: 120 }, 'bottomLeft');
  assertPoint(c.bottomRight, { x: 10, y: 20 }, 'bottomRight');
});

test('center maps to center for every rotation', () => {
  for (const rotation of [0, 90, 180, 270]) {
    const frame = createPageFrame(CROP_BOX, rotation);
    assertPoint(
      toPdfPoint(frame, frame.width / 2, frame.height / 2),
      { x: 110, y: 70 },
      `rotation ${rotation}`,
    );
  }
});

test('frames work with a crop box offset from the media box origin', () => {
  const offsetBox = { x: 40, y: 60, width: 300, height: 500 };
  for (const rotation of [0, 90, 180, 270]) {
    const frame = createPageFrame(offsetBox, rotation);
    const topLeft = toPdfPoint(frame, 0, 0);
    const bottomRight = toPdfPoint(frame, frame.width, frame.height);

    assert.ok(topLeft.x >= 40 && topLeft.x <= 340, 'x stays inside crop box');
    assert.ok(topLeft.y >= 60 && topLeft.y <= 560, 'y stays inside crop box');
    assert.ok(bottomRight.x >= 40 && bottomRight.x <= 340, 'x stays inside crop box');
    assert.ok(bottomRight.y >= 60 && bottomRight.y <= 560, 'y stays inside crop box');
  }
});
