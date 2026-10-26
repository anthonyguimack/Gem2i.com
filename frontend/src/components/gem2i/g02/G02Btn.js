/* Gem2i (`gem2i_02`) — own copy for the Gem2i package (D-GEM-2026-15), made from the Norules version so both
 * templates have the same pages; the Gem2i design comes later. Never import Norules files from here. */
/* Norules (`gem2i`) — B1 "pill with arrow" button + link system (boceto bocetos/norules-buttons-links.html,
 * approved 2026-10-23). One component for every action on the template; styles live in index.css (.nb*, .nl).
 *   variant: p = primary (night)   s = secondary (outline)   a = accent (brand blue)
 *            g = ghost on photos / dark bands   w = white solid on dark bands   c = current colour (list rows)
 *   size: 'sm' for cards and compact rows        icon: 'arrow' | 'ext' | 'down' | 'none'
 * Links (inline text) use NLink: underline drawn left→right, external ones get ↗ in the accent colour. */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ArrowDown, Loader2 } from 'lucide-react';

const ICONS = { arrow: ArrowRight, ext: ArrowUpRight, down: ArrowDown };

export function NBtn({ to, href, onClick, type = 'button', variant = 'p', size, icon = 'arrow', loading, disabled,
  className = '', children, newTab, ...rest }) {
  const custom = React.isValidElement(icon); // e.g. icon={<MapIcon />}: shown in the circle, no rotation
  const Icon = loading ? Loader2 : ICONS[icon];
  const cls = `nb nb-${variant}${size === 'sm' ? ' nb-sm' : ''}${Icon || custom ? '' : ' nb-noar'} ${icon === 'ext' || custom ? 'nb-ext' : icon === 'down' ? 'nb-down' : ''} ${className}`;
  const inner = <>
    <span className="nb-tx">{children}</span>
    {(Icon || custom) && <span className="nb-ar" aria-hidden="true">{custom && !loading ? icon : <Icon className={loading ? 'animate-spin' : ''} />}</span>}
  </>;
  if (to) return <Link to={to} onClick={onClick} className={cls} {...rest}>{inner}</Link>;
  if (href) {
    const ext = newTab || /^https?:\/\//i.test(href);
    return <a href={href} onClick={onClick} className={cls} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined} {...rest}>{inner}</a>;
  }
  return <button type={type} onClick={onClick} disabled={disabled || loading} className={cls} {...rest}>{inner}</button>;
}

/** Static look of a B1 button inside a clickable card (the card is the link). */
export function NBtnLook({ variant = 'g', size = 'sm', icon = 'arrow', className = '', children }) {
  const Icon = ICONS[icon];
  return (
    <span className={`nb nb-${variant}${size === 'sm' ? ' nb-sm' : ''} ${className}`}>
      <span className="nb-tx">{children}</span>
      {Icon && <span className="nb-ar" aria-hidden="true"><Icon /></span>}
    </span>
  );
}

export function NLink({ to, href, children, className = '', ...rest }) {
  if (to) return <Link to={to} className={`nl ${className}`} {...rest}>{children}</Link>;
  const ext = /^https?:\/\//i.test(href || '');
  return <a href={href} className={`nl${ext ? ' nl-ext' : ''} ${className}`} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined} {...rest}>{children}</a>;
}
