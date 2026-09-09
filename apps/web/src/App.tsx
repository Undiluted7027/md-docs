import { LandingPage } from './landing/LandingPage.tsx';
import { DocumentPage, DocumentUnavailable } from './documents/DocumentPage.tsx';
import { DocumentBrandHeader } from './documents/DocumentChrome.tsx';
import '@fontsource-variable/manrope';
import './index.css';
import './documents/documents.css';

export default function App() {
  if (location.pathname === '/')
    return (
      <main className="landing">
        <LandingPage />
      </main>
    );
  return (
    <main className="document-app">
      <DocumentBrandHeader />
      {route()}
    </main>
  );
}

function route() {
  const documentId = documentIdFromPath(location.pathname);
  if (documentId) return <DocumentPage documentId={documentId} />;

  return <DocumentUnavailable />;
}

function documentIdFromPath(path: string): string | null {
  const match = /^\/documents\/([^/]+)\/?$/.exec(path);
  return match?.[1] ?? null;
}
