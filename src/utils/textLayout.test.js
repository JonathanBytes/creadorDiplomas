import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASELINE_TO_DESCENT_RATIO,
  CENTER_TO_BASELINE_RATIO,
  computeTextLayout,
  fitFontSize,
} from './textLayout.js';

const BASE = {
  pageWidth: 600,
  pageHeight: 800,
  position: { x: 0.5, y: 0.5 },
  textMargin: 40,
  fontSize: 24,
  textWidth: 200,
};

test('text that fits keeps its font size and is centered', () => {
  const layout = computeTextLayout(BASE);

  assert.equal(layout.fittedFontSize, 24);
  assert.equal(layout.width, 200);
  assert.equal(layout.startX, 300 - 100);
  assert.equal(layout.baselineY, 400 + CENTER_TO_BASELINE_RATIO * 24);
  assert.equal(layout.underline, null);
});

test('text wider than the margins is scaled to the available width', () => {
  const layout = computeTextLayout({ ...BASE, textWidth: 1000 });

  assert.equal(layout.width, 600 - 80);
  assert.equal(layout.startX, 40);
  assert.ok(layout.fittedFontSize < BASE.fontSize);
  assert.equal(
    layout.fittedFontSize,
    (BASE.fontSize * (600 - 80)) / 1000,
  );
});

test('position is expressed in displayed page percentages', () => {
  const layout = computeTextLayout({
    ...BASE,
    position: { x: 0.25, y: 0.75 },
    textWidth: 100,
  });

  assert.equal(layout.startX, 150 - 50);
  assert.equal(layout.baselineY, 600 + CENTER_TO_BASELINE_RATIO * 24);
});

test('underline sits below the baseline with the requested offset and thickness', () => {
  const layout = computeTextLayout({
    ...BASE,
    textWidth: 100,
    isUnderline: true,
    underlineOffset: 5,
    underlineThickness: 2,
  });

  assert.deepEqual(layout.underline, {
    x: 250,
    top: layout.baselineY + BASELINE_TO_DESCENT_RATIO * 24 + 5,
    width: 100,
    thickness: 2,
  });
});

test('margins larger than half the page clamp the available width to zero', () => {
  const layout = computeTextLayout({ ...BASE, textMargin: 400, textWidth: 300 });

  assert.equal(layout.fittedFontSize, BASE.fontSize);
  assert.ok(Number.isFinite(layout.width));
  assert.ok(Number.isFinite(layout.startX));
});

test('zero font size does not produce NaN', () => {
  const layout = computeTextLayout({ ...BASE, fontSize: 0, textWidth: 0 });

  assert.equal(layout.fittedFontSize, 0);
  assert.equal(layout.width, 0);
  assert.ok(Number.isFinite(layout.startX));
  assert.ok(Number.isFinite(layout.baselineY));
});

test('fitFontSize returns the original size when no scaling is needed', () => {
  assert.equal(fitFontSize(24, 200, 520), 24);
  assert.equal(fitFontSize(24, 520, 520), 24);
  assert.equal(fitFontSize(24, 0, 520), 24);
  assert.equal(fitFontSize(24, 200, 0), 24);
});
