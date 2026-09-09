import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { CreateDocument } from './CreateDocument.tsx';

afterEach(cleanup);

test('submits once, shows the pending state, and navigates after creation', async () => {
  let finishRequest: (document: { id: string }) => void = () => undefined;
  const request = new Promise<{ id: string }>((resolve) => {
    finishRequest = resolve;
  });
  const createDocumentRequest = mock(() => request);
  const navigate = mock(() => undefined);
  const view = render(
    <CreateDocument createDocumentRequest={createDocumentRequest} navigate={navigate} />,
  );
  const button = view.getByRole('button', { name: 'Create document' });

  fireEvent.click(button);
  fireEvent.click(button);

  expect(createDocumentRequest).toHaveBeenCalledTimes(1);
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(view.getByRole('status').textContent).toContain('Opening your document');

  finishRequest({ id: 'new-document' });
  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith('/documents/new-document');
  });
});

test('shows a failure and allows the request to be retried', async () => {
  const createDocumentRequest = mock(() => Promise.reject(new Error('Server unavailable')));
  const navigate = mock(() => undefined);
  const view = render(
    <CreateDocument createDocumentRequest={createDocumentRequest} navigate={navigate} />,
  );

  fireEvent.click(view.getByRole('button', { name: 'Create document' }));

  const alert = await view.findByRole('alert');
  expect(alert.textContent).toContain('try again');
  expect(
    (view.getByRole('button', { name: 'Create document' }) as HTMLButtonElement).disabled,
  ).toBe(false);

  fireEvent.click(view.getByRole('button', { name: 'Create document' }));
  await waitFor(() => {
    expect(createDocumentRequest).toHaveBeenCalledTimes(2);
  });
  expect(navigate).not.toHaveBeenCalled();
});
