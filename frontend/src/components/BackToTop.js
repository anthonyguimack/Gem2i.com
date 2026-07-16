import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * Floating "Back to top" button.
 *
 * Appears after the user scrolls ~300px. Smooth-scrolls the window back to
 * the top when clicked. The positioning is fixed so it stays out of the way
 * of the layout on all routes.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center rounded-full shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ backgroundColor: 'var(--color-primary, #111827)', color: '#FFFFFF' }}
      data-testid="back-to-top-btn"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
