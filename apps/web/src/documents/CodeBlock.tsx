import { isValidElement, type ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import { HighlightedCodeBlock } from './HighlightedCodeBlock.tsx';
import { MermaidDiagram } from './MermaidDiagram.tsx';
import { supportedHighlightLanguage } from './highlightLanguages.ts';

type PreProps = ComponentProps<'pre'> & ExtraProps;
type CodeElementProps = { children?: string | readonly string[]; className?: string };

function languageFrom(className: string | undefined) {
  return /(?:^|\s)language-([^\s]+)/u.exec(className ?? '')?.[1];
}

export function CodeBlock({ children }: PreProps) {
  if (!isValidElement<CodeElementProps>(children)) {
    return <pre>{children}</pre>;
  }

  const language = languageFrom(children.props.className);
  const codeChildren = children.props.children ?? '';
  const source = (typeof codeChildren === 'string' ? codeChildren : codeChildren.join('')).replace(
    /\n$/u,
    '',
  );

  if (language?.toLowerCase() === 'mermaid') {
    return <MermaidDiagram source={source} />;
  }

  const highlightLanguage = language ? supportedHighlightLanguage(language) : undefined;
  if (highlightLanguage) {
    return <HighlightedCodeBlock source={source} language={highlightLanguage} />;
  }

  return <pre>{children}</pre>;
}
