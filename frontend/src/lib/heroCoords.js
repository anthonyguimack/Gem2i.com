/**
 * heroCoords.js — shared helpers for the Hero canvas coordinate system.
 *
 * The CMS canvas is 700 × 300 logical units.
 * Admin drags label chips to x/y positions; those values are stored on each
 * hero slide as title_x, title_y, subtitle_x, subtitle_y, etc.
 *
 * At render time the coordinates map to CSS percentages of the hero container:
 *   left = (x / 700) * 100 %
 *   top  = (y / 300) * 100 %
 *
 * Used by: HeroSection.js (classic/modern/aurex themes)
 *          PersonalBrandSections.js → PBHero (personalbrand theme)
 */

export const CANVAS_W = 700;
export const CANVAS_H = 300;

/** Convert a canvas x coordinate → CSS left percentage string */
export function toLeftPct(x, fallback = 100) {
  return `${((x ?? fallback) / CANVAS_W) * 100}%`;
}

/** Convert a canvas y coordinate → CSS top percentage string */
export function toTopPct(y, fallback = 50) {
  return `${((y ?? fallback) / CANVAS_H) * 100}%`;
}

/**
 * Build the entrance-animation inline style for a hero layer.
 *
 * @param {string} effect      - Direction: 'top' | 'bottom' | 'left' | 'right'
 * @param {number} startDelay  - Delay in ms before animation begins
 * @param {number} speed       - Animation duration in ms (speed_per_layer)
 */
export function effectStyle(effect, startDelay, speed = 400) {
  const transforms = {
    top:    'translateY(-40px)',
    bottom: 'translateY(40px)',
    left:   'translateX(-40px)',
    right:  'translateX(40px)',
  };
  return {
    animation: `heroLayerIn ${speed}ms ease-out ${startDelay || 0}ms both`,
    '--hero-from': transforms[effect] || 'translateY(-40px)',
  };
}

/** CSS keyframe block — inject once into the page */
export const HERO_KEYFRAMES = `
  @keyframes heroLayerIn {
    from { opacity: 0; transform: var(--hero-from); }
    to   { opacity: 1; transform: translate(0,0); }
  }
`;
