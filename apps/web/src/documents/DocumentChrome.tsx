import type { ReactNode } from 'react';

const iconPaths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  link: 'm10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  export: 'M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5',
  undo: 'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 7 7v3',
  redo: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0-7 7v3',
  source: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  page: 'M5 2h9l5 5v15H5V2Zm9 0v5h5M9 12h6m-6 4h4',
} satisfies Record<string, string>;

export function DocumentIcon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      className="document-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

export function DocumentBrandHeader() {
  return (
    <header className="document-brand-header">
      <a className="document-brand" href="/" aria-label="Markdown Docs home">
        <DocumentIcon name="page" />
        <span>Markdown Docs</span>
      </a>
      <span className="document-brand-caption">A shared space for Markdown.</span>
    </header>
  );
}

export function DocumentWelcome({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="document-welcome">
        <div className="document-welcome-intro">
          <p className="document-eyebrow">A little space. A lot of possibility.</p>
          <p className="document-welcome-headline">
            Make room
            <br />
            for <em>your ideas.</em>
          </p>
          <p className="document-welcome-description">
            A blank page, a shared thought, a work in progress. It all starts here.
          </p>
          <div className="document-paper-art" aria-hidden="true">
            <div className="document-paper-back" />
            <div className="document-paper-front">
              <span>#</span>
              <i />
              <i />
              <i />
            </div>
            <span className="document-paper-caption">PLAIN TEXT. SHARED SPACE.</span>
          </div>
        </div>
        <div className="document-welcome-panel">{children}</div>
      </div>
      <footer className="document-welcome-footer">
        <span>Good ideas need company.</span>
        <a href="/">
          Back to home <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </>
  );
}
