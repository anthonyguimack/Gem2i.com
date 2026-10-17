import React from 'react';

/**
 * gem2i typography T-2 (A Capital style, approved 2026-10-17): headings in
 * Playfair Display with the LAST word in Playfair italic, lighter weight, in
 * the gem2i link blue. One-word titles stay plain. Multi-line titles (\n)
 * keep their breaks; the accent goes on the last word of the last line.
 */
export default function AccentTitle({ text }) {
  const lines = String(text || '').split('\n');
  const total = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return lines.map((line, i) => {
    const last = i === lines.length - 1;
    const words = line.trim().split(/\s+/);
    const accent = last && total > 1 ? words.pop() : null;
    return (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {words.join(' ')}
        {accent && <>{words.length ? ' ' : ''}<em className="gem-accent">{accent}</em></>}
      </React.Fragment>
    );
  });
}
