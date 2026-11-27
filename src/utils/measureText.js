export const DEFAULT_PREVIEW_FONT = 'Helvetica, Arial, sans-serif';

const REFERENCE_SIZE = 100;

let measuringContext = null;

function getMeasuringContext() {
  if (!measuringContext) {
    measuringContext = document.createElement('canvas').getContext('2d');
  }
  return measuringContext;
}

export function measureTextWidth(text, fontFamily, fontSize) {
  if (!text || !(fontSize > 0)) return 0;

  const context = getMeasuringContext();
  context.font = `${REFERENCE_SIZE}px ${fontFamily}`;

  return (context.measureText(text).width * fontSize) / REFERENCE_SIZE;
}
