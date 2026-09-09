import { useCallback, useEffect, useRef } from 'react';

export const headingIdPrefix = 'document-heading-';

export function sectionUrl(id: string, currentUrl = window.location.href) {
  const url = new URL(currentUrl);
  url.hash = id;
  return url.toString();
}

function headingFromHash() {
  if (!window.location.hash) return null;
  try {
    return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return null;
  }
}

/** Replays initial fragment navigation after collaborative content has loaded. */
export function useSectionLinkNavigation(source: string, enabled: boolean) {
  const reachedHash = useRef<string | null>(null);

  const reachCurrentHash = useCallback(() => {
    if (!window.location.hash || reachedHash.current === window.location.hash) return;
    const heading = headingFromHash();
    if (!heading) return;
    heading.scrollIntoView();
    reachedHash.current = window.location.hash;
  }, []);

  // Retry on every content change: the target heading may only appear once
  // collaborative content has loaded. `reachCurrentHash` is a no-op once reached.
  useEffect(() => {
    if (enabled) reachCurrentHash();
  }, [enabled, source, reachCurrentHash]);

  // The hashchange listener only needs wiring when `enabled` changes.
  useEffect(() => {
    if (!enabled) return;
    function handleHashChange() {
      reachedHash.current = null;
      reachCurrentHash();
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [enabled, reachCurrentHash]);
}
