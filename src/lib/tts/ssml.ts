/**
 * SSML utilities
 *
 * We intentionally allow only a tiny subset of SSML in user-provided text:
 * - <break time="..."/> (time must be like "250ms" or "1s")
 *
 * Everything else is treated as plain text and XML-escaped.
 */

const BREAK_TAG_REGEX = /<break\s+time=(["'])([^"']+)\1\s*\/\s*>/gi;
const VALID_BREAK_TIME_REGEX = /^\d+(\.\d+)?(ms|s)$/i;

export function stripAllowedBreakTags(text: string): string {
  return text.replace(BREAK_TAG_REGEX, '');
}

export function countBillableCharacters(text: string): number {
  return stripAllowedBreakTags(text).length;
}

export function truncateTextPreservingBreakTags(text: string, maxBillableChars: number): string {
  if (maxBillableChars <= 0) return '';

  let out = '';
  let billable = 0;
  let lastIndex = 0;

  for (const match of text.matchAll(BREAK_TAG_REGEX)) {
    const idx = match.index ?? 0;
    const before = text.slice(lastIndex, idx);
    if (before) {
      const remaining = maxBillableChars - billable;
      if (remaining <= 0) return out;
      if (before.length <= remaining) {
        out += before;
        billable += before.length;
      } else {
        out += before.slice(0, remaining);
        billable += remaining;
        return out;
      }
    }

    // Include the break tag verbatim; it doesn't count toward billable characters.
    out += match[0];
    lastIndex = idx + match[0].length;
  }

  // Trailing text after last break tag
  const tail = text.slice(lastIndex);
  if (tail) {
    const remaining = maxBillableChars - billable;
    if (remaining <= 0) return out;
    out += tail.slice(0, remaining);
  }

  return out;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escapes user text for SSML, but preserves *valid* <break time="..."/> tags.
 */
export function sanitizeSsmlTextAllowingBreaks(text: string): string {
  let out = '';
  let lastIndex = 0;

  for (const match of text.matchAll(BREAK_TAG_REGEX)) {
    const idx = match.index ?? 0;
    const before = text.slice(lastIndex, idx);
    out += escapeXml(before);

    const time = String(match[2] || '').trim();
    if (VALID_BREAK_TIME_REGEX.test(time)) {
      out += `<break time="${time}"/>`;
    } else {
      // Invalid break tag: treat it as plain text
      out += escapeXml(match[0]);
    }

    lastIndex = idx + match[0].length;
  }

  out += escapeXml(text.slice(lastIndex));
  return out;
}


