import { StandardFonts, degrees } from 'pdf-lib';
import { createPageFrame, toPdfPoint } from './pageGeometry.js';
import { computeTextLayout } from './textLayout.js';
import { LAYER_KEYS } from './layers.js';

/**
 * Draws one text layer in display-page coordinates. Returns the layout used,
 * in page units, or null when there is nothing to draw.
 */
export function drawTextLayer(page, frame, {
  text,
  font,
  color,
  position,
  fontSize,
  isUnderline = false,
  underlineOffset = 5,
  underlineThickness = 2,
  textMargin = 40,
}) {
  if (!text) return null;

  const layout = computeTextLayout({
    pageWidth: frame.width,
    pageHeight: frame.height,
    position,
    textMargin,
    fontSize,
    textWidth: font.widthOfTextAtSize(text, fontSize),
    isUnderline,
    underlineOffset,
    underlineThickness,
  });

  const baseline = toPdfPoint(frame, layout.startX, layout.baselineY);

  page.drawText(text, {
    x: baseline.x,
    y: baseline.y,
    size: layout.fittedFontSize,
    font,
    color,
    rotate: degrees(frame.rotation),
  });

  if (layout.underline) {
    const corner = toPdfPoint(
      frame,
      layout.underline.x,
      layout.underline.top + layout.underline.thickness,
    );

    page.drawRectangle({
      x: corner.x,
      y: corner.y,
      width: layout.underline.width,
      height: layout.underline.thickness,
      color,
      rotate: degrees(frame.rotation),
    });
  }

  return layout;
}

/**
 * Draws the enabled layers for one student. The page frame is computed once so
 * every layer shares the same displayed-page coordinate system.
 */
export function drawStudentLayers(page, { student, layers, fonts, colors }) {
  const frame = createPageFrame(page.getCropBox(), page.getRotation().angle);
  const layouts = {};

  for (const key of LAYER_KEYS) {
    const layer = layers[key];
    if (!layer?.enabled) continue;

    const layout = drawTextLayer(page, frame, {
      text: student[key],
      font: fonts[key],
      color: colors[key],
      position: layer.position,
      fontSize: layer.fontSize,
      isUnderline: layer.isUnderline,
      underlineOffset: layer.underlineOffset,
      underlineThickness: layer.underlineThickness,
      textMargin: layer.margin,
    });

    if (layout) layouts[key] = layout;
  }

  return { frame, layouts };
}

/**
 * Draws a single name onto the first page using the exact same layout model as
 * the on-screen preview. Returns the layout used, in page units.
 */
export async function drawDiplomaText(page, {
  name,
  font,
  color,
  textPosition,
  fontSize,
  isUnderline = false,
  underlineOffset = 5,
  underlineThickness = 2,
  textMargin = 40,
}) {
  const frame = createPageFrame(page.getCropBox(), page.getRotation().angle);

  const layout = drawTextLayer(page, frame, {
    text: name,
    font,
    color,
    position: textPosition,
    fontSize,
    isUnderline,
    underlineOffset,
    underlineThickness,
    textMargin,
  });

  return { frame, layout };
}

export async function embedDocumentFont(pdfDoc, fontBytes) {
  if (fontBytes) return pdfDoc.embedFont(fontBytes);
  return pdfDoc.embedFont(StandardFonts.Helvetica);
}
