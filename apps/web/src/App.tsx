import { LandingPage } from './landing/LandingPage.tsx';
import { DocumentPage, DocumentUnavailable } from './documents/DocumentPage.tsx';
import './index.css';

export default function App() {
  return <main className={location.pathname === '/' ? 'landing' : undefined}>{route()}</main>;
}

function route() {
  if (location.pathname === '/') return <LandingPage />;

  const documentId = documentIdFromPath(location.pathname);
  if (documentId) return <DocumentPage documentId={documentId} />;

  return <DocumentUnavailable />;
}

function documentIdFromPath(path: string): string | null {
  const match = /^\/documents\/([^/]+)\/?$/.exec(path);
  return match?.[1] ?? null;
}
