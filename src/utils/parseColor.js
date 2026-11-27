import { rgb } from 'pdf-lib';

const HEX_PATTERN = /^[0-9a-f]{6}$/i;

export function parseColor(value) {
  const hex = String(value ?? '')
    .trim()
    .replace(/^#/, '');

  const expanded = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;

  if (!HEX_PATTERN.test(expanded)) {
    return rgb(0, 0, 0);
  }

  return rgb(
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255,
  );
}
