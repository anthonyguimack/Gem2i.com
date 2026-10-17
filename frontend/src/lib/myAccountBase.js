import { createContext, useContext } from 'react';

/**
 * The URL prefix a My Account design is currently mounted on.
 *
 * A design version must NEVER hardcode its own path. The same components are
 * served from two places:
 *   · `/my-account`   — production, whatever version the brand activated;
 *   · `/my-account2`  — that version's staging route, where it keeps being built.
 *
 * Hardcoding `/my-account2` inside the 2.0 pages caused exactly two bugs when it
 * was served as the production theme (2026-07-31):
 *   1. the sidebar lost its active item — the active test compares the link
 *      against `location.pathname`, and `/my-account2/...` never matches
 *      `/my-account/...`;
 *   2. the first click jumped the URL to `/my-account2`, exposing the staging
 *      path to members.
 *
 * So every link, redirect and path test inside a version composes off this value.
 * The default is production, so a component rendered without a provider — a
 * modal in a portal, a test — behaves as if it were live.
 */
export const MyAccountBaseContext = createContext('/my-account');

/** `'/my-account'` | `'/my-account2'` | … — never ends with a slash. */
export function useMyAccountBase() {
  return useContext(MyAccountBaseContext);
}
