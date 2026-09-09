import { useEffect, useState } from 'react';

type MarkupState =
  | { source: string; status: 'loading' }
  | { source: string; status: 'ready'; html: string }
  | { source: string; status: 'error' };

/** Runs an asynchronous renderer without allowing old work to replace newer source. */
export function useAsyncMarkup(source: string, render: (source: string) => Promise<string>) {
  const [state, setState] = useState<MarkupState>({ source, status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ source, status: 'loading' });

    void render(source).then(
      (html) => {
        if (!cancelled) setState({ source, status: 'ready', html });
      },
      () => {
        if (!cancelled) setState({ source, status: 'error' });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [render, source]);

  if (state.source !== source) return { source, status: 'loading' } as const;
  return state;
}
