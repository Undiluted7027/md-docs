import { useState, type ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { headingIdPrefix, sectionUrl } from './sectionLinks.ts';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingProps = ComponentPropsWithoutRef<'h1'> & ExtraProps;
type CopyStatus = 'idle' | 'copied' | 'error';
type CopyResult = { headingId: string; status: Exclude<CopyStatus, 'idle'> };

/**
 * Builds the preview renderer for one heading level. react-markdown compares
 * `components` by identity, so each level is created once at module load.
 */
function sectionHeading(Heading: HeadingTag) {
  return function SectionHeading({ children, ...props }: HeadingProps) {
    const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
    const headingProps = { ...props };
    // react-markdown's syntax-tree node is useful to custom renderers, but it is
    // not a valid HTML attribute and should not reach the heading element.
    delete headingProps.node;
    const { id } = headingProps;
    const copyStatus: CopyStatus =
      copyResult && copyResult.headingId === id ? copyResult.status : 'idle';

    if (!id?.startsWith(headingIdPrefix)) {
      return <Heading {...headingProps}>{children}</Heading>;
    }

    const className = ['preview-section-heading', headingProps.className].filter(Boolean).join(' ');

    async function copyLink() {
      if (!id) return;
      try {
        await navigator.clipboard.writeText(sectionUrl(id));
        setCopyResult({ headingId: id, status: 'copied' });
      } catch {
        setCopyResult({ headingId: id, status: 'error' });
      }
    }

    return (
      <Heading {...headingProps} className={className}>
        <span>{children}</span>
        <button
          type="button"
          className="section-link-button"
          aria-label="Copy link to this section"
          onClick={() => void copyLink()}
        >
          {copyStatus === 'copied'
            ? 'Copied'
            : copyStatus === 'error'
              ? 'Copy failed'
              : 'Copy link'}
        </button>
      </Heading>
    );
  };
}

export const previewHeadingComponents = {
  h1: sectionHeading('h1'),
  h2: sectionHeading('h2'),
  h3: sectionHeading('h3'),
  h4: sectionHeading('h4'),
  h5: sectionHeading('h5'),
  h6: sectionHeading('h6'),
};
