/**
 * Normalize rich text content before rendering:
 *  - Convert non-breaking spaces (&nbsp; / U+00A0) to regular spaces so the
 *    browser can wrap at word boundaries instead of breaking words mid-char.
 *    (The RichTextEditor/Quill pastes often preserve &nbsp; between every word,
 *    which is the main cause of the ugly mid-word splits on narrow viewports.)
 *  - Leave every other whitespace/tag untouched.
 */
export function normalizeRichText(html) {
  if (!html) return '';
  return String(html)
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ');
}
