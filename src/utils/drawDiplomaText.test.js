import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { toPdfPoint } from './pageGeometry.js';
import { drawDiplomaText, drawStudentLayers } from './drawDiplomaText.js';
import { createDefaultLayers } from './layers.js';

const PDFJS_OPTIONS = {
  useWorkerFetch: false,
  isEvalSupported: false,
  verbosity: 0,
};

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;
const TOLERANCE = 0.01;

function assertClose(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < TOLERANCE,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

async function renderAndRead({ rotation, cropBox, textPosition, fontSize = 24, name = 'HOLA' }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  if (cropBox) page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
  if (rotation) page.setRotation({ type: 'degrees', angle: rotation });

  const { frame, layout } = await drawDiplomaText(page, {
    name,
    font,
    color: undefined,
    textPosition,
    fontSize,
    textMargin: 40,
  });

  const bytes = await doc.save();
  const pdf = await pdfjsLib.getDocument({ data: bytes, ...PDFJS_OPTIONS }).promise;

  const pdfPage = await pdf.getPage(1);
  const viewport = pdfPage.getViewport({ scale: 1 });
  const textContent = await pdfPage.getTextContent();
  await pdf.loadingTask.destroy();

  const item = textContent.items.find((entry) => entry.str === name);
  assert.ok(item, 'text item should be present in the exported PDF');

  const [, b, , , e, f] = item.transform;
  const angle = ((Math.atan2(b, item.transform[0]) * 180) / Math.PI + 360) % 360;

  return { frame, layout, baseline: { x: e, y: f }, angle, viewport };
}

test('exported baseline matches the shared layout model for every rotation', async () => {
  const textPosition = { x: 0.3, y: 0.7 };

  for (const rotation of [0, 90, 180, 270]) {
    const { frame, layout, baseline, angle, viewport } = await renderAndRead({
      rotation,
      textPosition,
    });

    const expected = toPdfPoint(frame, layout.startX, layout.baselineY);

    assertClose(baseline.x, expected.x, `rotation ${rotation} baseline x`);
    assertClose(baseline.y, expected.y, `rotation ${rotation} baseline y`);
    assertClose(angle, frame.rotation, `rotation ${rotation} text angle`);

    assertClose(viewport.width, frame.width, `rotation ${rotation} displayed width`);
    assertClose(viewport.height, frame.height, `rotation ${rotation} displayed height`);
  }
});

test('text is centered on the requested percentage of the displayed page', async () => {
  const textPosition = { x: 0.3, y: 0.7 };

  for (const rotation of [0, 90, 180, 270]) {
    const { frame, layout, baseline } = await renderAndRead({ rotation, textPosition });

    const visualCenterX = layout.startX + layout.width / 2;
    const visualCenterY = layout.baselineY - 0.35 * layout.fittedFontSize;

    assertClose(visualCenterX, textPosition.x * frame.width, `rotation ${rotation} center x`);
    assertClose(visualCenterY, textPosition.y * frame.height, `rotation ${rotation} center y`);

    const expectedBaseline = toPdfPoint(frame, layout.startX, layout.baselineY);
    assertClose(baseline.x, expectedBaseline.x, `rotation ${rotation} drawn baseline x`);
    assertClose(baseline.y, expectedBaseline.y, `rotation ${rotation} drawn baseline y`);
  }
});

test('crop box offset is honored by both the frame and the exported text', async () => {
  const cropBox = { x: 40, y: 60, width: 400, height: 500 };
  const textPosition = { x: 0.5, y: 0.5 };

  for (const rotation of [0, 90, 180, 270]) {
    const { frame, layout, baseline, angle } = await renderAndRead({
      rotation,
      cropBox,
      textPosition,
    });

    assert.equal(frame.width, rotation % 180 === 0 ? cropBox.width : cropBox.height);
    assert.equal(frame.height, rotation % 180 === 0 ? cropBox.height : cropBox.width);

    const expected = toPdfPoint(frame, layout.startX, layout.baselineY);

    assertClose(baseline.x, expected.x, `rotation ${rotation} crop baseline x`);
    assertClose(baseline.y, expected.y, `rotation ${rotation} crop baseline y`);
    assertClose(angle, frame.rotation, `rotation ${rotation} crop text angle`);
  }
});

test('long names are shrunk to the lateral margins in the exported PDF', async () => {
  const name = 'NOMBRE EXTREMADAMENTE LARGO PARA VERIFICAR EL AJUSTE AUTOMATICO';
  const textPosition = { x: 0.5, y: 0.5 };
  const textMargin = 40;

  const { frame, layout } = await renderAndRead({
    rotation: 0,
    textPosition,
    name,
    fontSize: 60,
  });

  assert.ok(layout.fittedFontSize < 60, 'font size should be reduced');
  assertClose(layout.width, frame.width - textMargin * 2, 'fitted width');

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const layout2 = (await drawDiplomaText(page, {
    name,
    font,
    color: undefined,
    textPosition,
    fontSize: 60,
    textMargin,
  })).layout;

  assertClose(layout2.startX, textMargin, 'left edge sits on the margin');
});

async function readTextItems(bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes, ...PDFJS_OPTIONS }).promise;
  const pdfPage = await pdf.getPage(1);
  const textContent = await pdfPage.getTextContent();
  await pdf.loadingTask.destroy();

  return Object.fromEntries(textContent.items.map((item) => [item.str, item]));
}

test('name and description layers are drawn at independent positions and sizes', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const layers = createDefaultLayers();
  layers.name.position = { x: 0.3, y: 0.4 };
  layers.name.fontSize = 30;
  layers.description.enabled = true;
  layers.description.position = { x: 0.7, y: 0.6 };
  layers.description.fontSize = 12;

  const { frame, layouts } = drawStudentLayers(page, {
    student: { name: 'ANA', description: 'INGENIERA' },
    layers,
    fonts: { name: font, description: font },
    colors: {},
  });

  assert.equal(layouts.name.fittedFontSize, 30);
  assert.equal(layouts.description.fittedFontSize, 12);

  const items = await readTextItems(await doc.save());

  for (const [key, text] of [['name', 'ANA'], ['description', 'INGENIERA']]) {
    const item = items[text];
    assert.ok(item, `${key} text should be present in the exported PDF`);

    const expected = toPdfPoint(frame, layouts[key].startX, layouts[key].baselineY);
    const drawnSize = Math.hypot(item.transform[0], item.transform[1]);

    assertClose(item.transform[4], expected.x, `${key} baseline x`);
    assertClose(item.transform[5], expected.y, `${key} baseline y`);
    assert.ok(
      Math.abs(drawnSize - layouts[key].fittedFontSize) < 0.05,
      `${key} font size: expected ${layouts[key].fittedFontSize}, got ${drawnSize}`,
    );
  }
});

test('a disabled description layer is not exported', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const layers = createDefaultLayers();
  layers.description.enabled = false;

  const { layouts } = drawStudentLayers(page, {
    student: { name: 'ANA', description: 'INGENIERA' },
    layers,
    fonts: { name: font, description: font },
    colors: {},
  });

  assert.ok(layouts.name);
  assert.equal(layouts.description, undefined);

  const items = await readTextItems(await doc.save());
  assert.ok(items.ANA);
  assert.equal(items.INGENIERA, undefined);
});
