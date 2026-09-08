import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentStatus } from './DocumentStatus.tsx';

test('shows a recovery note while reconnecting and while a save is retrying', () => {
  const reconnecting = renderToStaticMarkup(
    <DocumentStatus connection="Reconnecting…" save="Waiting to reconnect" loaded />,
  );
  expect(reconnecting).toContain('Connection: Reconnecting…');
  expect(reconnecting).toContain('Keep this tab open');
  expect(reconnecting).toContain('export your work');

  const saveFailed = renderToStaticMarkup(
    <DocumentStatus connection="Connected" save="Save failed — retrying" loaded />,
  );
  expect(saveFailed).toContain('remain in this tab and can be exported');
});

test('shows no recovery note once connected and saved', () => {
  const html = renderToStaticMarkup(
    <DocumentStatus connection="Connected" save="Saved" loaded />,
  );
  expect(html).toContain('Save: Saved');
  expect(html).not.toContain('recovery-note');
});
