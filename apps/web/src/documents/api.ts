import { apiUrl } from '../serverUrls.ts';

interface CreatedDocument {
  id: string;
}

export async function createDocument(): Promise<CreatedDocument> {
  const response = await fetch(apiUrl('/api/documents'), { method: 'POST' });
  if (!response.ok) throw new Error('Could not create document');

  const result: unknown = await response.json();
  if (!isCreatedDocument(result)) throw new Error('Invalid create-document response');
  return result;
}

export async function documentExists(id: string): Promise<boolean> {
  const response = await fetch(apiUrl(`/api/documents/${encodeURIComponent(id)}`));
  if (response.status === 400 || response.status === 404) return false;
  if (!response.ok) throw new Error('Could not load document');
  return true;
}

function isCreatedDocument(value: unknown): value is CreatedDocument {
  return (
    typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
  );
}
