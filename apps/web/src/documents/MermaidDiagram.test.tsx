import { afterEach, expect, mock, test } from 'bun:test';
import { act, cleanup, render } from '@testing-library/react';
import { MermaidDiagramView, type DiagramRenderer } from './MermaidDiagram.tsx';

afterEach(cleanup);

function deferredMarkup() {
  let resolve: (html: string) => void = () => undefined;
  const promise = new Promise<string>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

test('does not let an older diagram replace newer source', async () => {
  const oldDiagram = deferredMarkup();
  const newDiagram = deferredMarkup();
  const renderDiagram: DiagramRenderer = mock((source) =>
    source === 'graph TD\nOld' ? oldDiagram.promise : newDiagram.promise,
  );
  const view = render(<MermaidDiagramView source={'graph TD\nOld'} render={renderDiagram} />);

  view.rerender(<MermaidDiagramView source={'graph TD\nNew'} render={renderDiagram} />);
  await act(async () => {
    newDiagram.resolve('<svg data-diagram="new"></svg>');
    await newDiagram.promise;
  });
  expect(view.container.innerHTML).toContain('data-diagram="new"');

  await act(async () => {
    oldDiagram.resolve('<svg data-diagram="old"></svg>');
    await oldDiagram.promise;
  });
  expect(view.container.innerHTML).toContain('data-diagram="new"');
  expect(view.container.innerHTML).not.toContain('data-diagram="old"');
});

test('keeps malformed Mermaid source readable and shows a local error', async () => {
  const renderDiagram: DiagramRenderer = mock(() => Promise.reject(new Error('bad syntax')));
  const view = render(
    <MermaidDiagramView source="graph definitely-invalid" render={renderDiagram} />,
  );

  const alert = await view.findByRole('alert');
  expect(alert.textContent).toContain('could not be rendered');
  expect(view.getByText('graph definitely-invalid')).toBeTruthy();
  expect(view.container.querySelector('svg')).toBeNull();
  expect(renderDiagram).toHaveBeenCalledTimes(1);
});
