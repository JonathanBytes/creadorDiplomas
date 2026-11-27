import { rgb } from 'pdf-lib';

const HEX_PATTERN = /^[0-9a-f]{6}$/i;

/** Returns `#rrggbb` (lowercase) for 3- or 6-digit hex input, or null. */
export function normalizeHexColor(value) {
  const hex = String(value ?? '')
    .trim()
    .replace(/^#/, '');

  const expanded = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;

  return HEX_PATTERN.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

export function isValidHexColor(value) {
  return normalizeHexColor(value) !== null;
}

export function parseColor(value) {
  const hex = normalizeHexColor(value);

  if (!hex) {
    return rgb(0, 0, 0);
  }

  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}
