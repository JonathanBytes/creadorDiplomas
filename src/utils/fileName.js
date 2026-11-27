const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const FALLBACK_FILENAME = 'diploma';

export function sanitizeFileName(name) {
  const safe = String(name ?? '')
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '');

  return safe || FALLBACK_FILENAME;
}

export function createFileNameFactory() {
  const usedNames = new Map();

  return (name) => {
    const base = sanitizeFileName(name);
    const count = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, count);

    return `${count === 1 ? base : `${base} (${count})`}.pdf`;
  };
}
