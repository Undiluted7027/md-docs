import type { Blockquote, Paragraph, Root } from 'mdast';
import type { Plugin } from 'unified';

const calloutLabels = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution',
} as const;

type CalloutType = keyof typeof calloutLabels;

function isCalloutType(value: string): value is CalloutType {
  return value in calloutLabels;
}

function calloutFrom(blockquote: Blockquote) {
  const firstParagraph = blockquote.children[0];
  if (firstParagraph?.type !== 'paragraph') return undefined;

  const firstText = firstParagraph.children[0];
  if (firstText?.type !== 'text') return undefined;

  const marker = /^\[!([A-Z]+)\](?:[ \t]*(?:\r?\n|$))/iu.exec(firstText.value);
  const type = marker?.[1]?.toUpperCase();
  if (!marker || !type || !isCalloutType(type)) return undefined;

  return { firstParagraph, firstText, marker: marker[0], type };
}

function calloutTitle(type: CalloutType): Paragraph {
  return {
    type: 'paragraph',
    data: { hProperties: { className: ['markdown-callout-title'] } },
    children: [{ type: 'strong', children: [{ type: 'text', value: calloutLabels[type] }] }],
  };
}

function transformCallout(blockquote: Blockquote) {
  const callout = calloutFrom(blockquote);
  if (!callout) return;

  const remainingText = callout.firstText.value.slice(callout.marker.length);
  if (remainingText) callout.firstText.value = remainingText;
  else callout.firstParagraph.children.shift();

  if (callout.firstParagraph.children.length === 0) blockquote.children.shift();
  blockquote.children.unshift(calloutTitle(callout.type));
  blockquote.data = {
    ...blockquote.data,
    hName: 'aside',
    hProperties: {
      className: ['markdown-callout', `markdown-callout-${callout.type.toLowerCase()}`],
    },
  };
}

/** Turns the five portable GitHub alert markers into labelled preview callouts. */
export const remarkCallouts: Plugin<[], Root> = () => (tree) => {
  for (const node of tree.children) {
    if (node.type === 'blockquote') transformCallout(node);
  }
};
