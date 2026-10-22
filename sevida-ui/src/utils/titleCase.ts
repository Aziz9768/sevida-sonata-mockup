/** Small words stay lowercase inside a Title Case label (not first, not last). */
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'vs', 'via']);

/**
 * Title Case for LABELS: sidebar items, tabs, column headers, filter labels, buttons, page and card titles.
 * Each word starts with a capital, small words (of, and, the, for, to, in...) stay lowercase, and a part after
 * a hyphen is capitalised too (Well-Care Visits). Only the first letter changes, so ID, HbA1c and COL-E are safe.
 * Do not use it on sentences, values in table cells or chips.
 */
export function titleCase(text: string): string {
  const words = text.split(' ');
  return words
    .map((w, i) => {
      const startsPart = i === 0 || /[:·]$/.test(words[i - 1]) || words[i - 1] === '–';
      if (!startsPart && i !== words.length - 1 && SMALL.has(w)) return w;
      return w.replace(/(^|[-–/])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
    })
    .join(' ');
}
