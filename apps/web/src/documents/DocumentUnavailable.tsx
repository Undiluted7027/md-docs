import { DocumentIcon, DocumentWelcome } from './DocumentChrome.tsx';

export function DocumentUnavailable() {
  return (
    <DocumentWelcome>
      <section className="document-gate">
        <span className="document-gate-icon">
          <DocumentIcon name="page" />
        </span>
        <p className="document-eyebrow">THIS PAGE IS OUT OF REACH</p>
        <h1>Document unavailable</h1>
        <p>
          Check that you opened the complete edit link, or ask the person who shared it to send it
          again.
        </p>
        <a className="document-primary-link" href="/">
          Back to home <DocumentIcon name="arrow" />
        </a>
      </section>
    </DocumentWelcome>
  );
}
