/**
 * Distance from the visual center of the text down to its baseline,
 * expressed as a fraction of the font size.
 */
export const CENTER_TO_BASELINE_RATIO = 0.35;

/**
 * Approximate descender clearance used to keep underlines below glyphs,
 * expressed as a fraction of the font size.
 */
export const BASELINE_TO_DESCENT_RATIO = 0.25;

export function fitFontSize(fontSize, textWidth, maxWidth) {
  if (!(fontSize > 0) || !(maxWidth > 0) || !(textWidth > maxWidth)) {
    return fontSize;
  }
  return (fontSize * maxWidth) / textWidth;
}

/**
 * Computes text placement in page units (PDF points) with a top-left display origin.
 * Both the canvas preview and the PDF exporter consume these values.
 */
export function computeTextLayout({
  pageWidth,
  pageHeight,
  position,
  textMargin = 0,
  fontSize,
  textWidth,
  isUnderline = false,
  underlineOffset = 5,
  underlineThickness = 2,
}) {
  const maxWidth = Math.max(0, pageWidth - textMargin * 2);
  const fittedFontSize = fitFontSize(fontSize, textWidth, maxWidth);
  const width = fontSize > 0 ? (textWidth * fittedFontSize) / fontSize : textWidth;
  const centerX = position.x * pageWidth;
  const centerY = position.y * pageHeight;
  const baselineY = centerY + CENTER_TO_BASELINE_RATIO * fittedFontSize;
  const startX = centerX - width / 2;

  return {
    fittedFontSize,
    width,
    startX,
    baselineY,
    underline: isUnderline
      ? {
          x: startX,
          top: baselineY + BASELINE_TO_DESCENT_RATIO * fittedFontSize + underlineOffset,
          width,
          thickness: underlineThickness,
        }
      : null,
  };
}
