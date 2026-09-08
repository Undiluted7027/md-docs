import { env } from './env.ts';

/** Builds an API URL for Render in production or Vite's local proxy in development. */
export function apiUrl(path: string, serverOrigin = env.VITE_SERVER_ORIGIN): string {
  return serverOrigin ? new URL(path, serverOrigin).toString() : path;
}

/**
 * Builds the collaboration WebSocket URL from the configured HTTP server origin,
 * or from the current page origin (via Vite's proxy) when none is set.
 * `browserLocation` is a test seam; production always uses the real `location`.
 */
export function collaborationUrl(
  serverOrigin = env.VITE_SERVER_ORIGIN,
  browserLocation?: Pick<Location, 'href'>,
): string {
  const url = serverOrigin
    ? new URL('/collaboration', serverOrigin)
    : new URL('/collaboration', (browserLocation ?? location).href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
