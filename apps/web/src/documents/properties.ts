import { isMap, isScalar, isSeq, parseDocument, type Scalar } from 'yaml';

export type PropertyValue = string | number | boolean;

export interface DocumentProperty {
  name: string;
  value: PropertyValue | PropertyValue[];
}

export type PropertiesResult =
  | { status: 'none' }
  | { status: 'valid'; properties: DocumentProperty[] }
  | { status: 'error'; message: string };

// Mirrors what `remark-frontmatter` (via micromark-extension-frontmatter) treats
// as YAML frontmatter: an opening `---` fence on the very first line and a
// closing `---` fence on its own line, each allowing trailing spaces or tabs,
// with either line ending. These two detectors must agree, otherwise a block
// could show both here and in the rendered document body.
const FRONTMATTER_FENCE = /^---[\t ]*$/u;

function frontmatterFrom(source: string): string | undefined {
  const lines = source.split(/\r?\n/u);
  if (!FRONTMATTER_FENCE.test(lines[0] ?? '')) return undefined;

  const closingFence = lines.findIndex((line, index) => index > 0 && FRONTMATTER_FENCE.test(line));
  if (closingFence === -1) return undefined;

  return lines.slice(1, closingFence).join('\n');
}

function scalarValue(node: Scalar): PropertyValue | undefined {
  const { value } = node;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function unsupportedValueMessage(name: string) {
  return `“${name}” uses a nested or unsupported value. Use text, numbers, booleans, or a flat list.`;
}

/** Parses the opening YAML block as display-only data for the properties panel. */
export function parseProperties(source: string): PropertiesResult {
  const frontmatter = frontmatterFrom(source);
  if (frontmatter === undefined) return { status: 'none' };

  const document = parseDocument(frontmatter, {
    schema: 'core',
    merge: false,
    resolveKnownTags: false,
    uniqueKeys: true,
  });

  if (document.errors.length > 0) {
    return {
      status: 'error',
      message: 'These properties could not be read. Check the YAML indentation and punctuation.',
    };
  }

  if (document.contents === null) return { status: 'valid', properties: [] };
  if (!isMap(document.contents)) {
    return { status: 'error', message: 'Properties must be written as names followed by values.' };
  }

  const properties: DocumentProperty[] = [];
  for (const pair of document.contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== 'string') {
      return { status: 'error', message: 'Every property needs a text name.' };
    }

    const name = pair.key.value;
    if (isScalar(pair.value)) {
      const value = scalarValue(pair.value);
      if (value === undefined) return { status: 'error', message: unsupportedValueMessage(name) };
      properties.push({ name, value });
      continue;
    }

    if (isSeq(pair.value)) {
      const values: PropertyValue[] = [];
      for (const item of pair.value.items) {
        if (!isScalar(item)) {
          return { status: 'error', message: unsupportedValueMessage(name) };
        }
        const value = scalarValue(item);
        if (value === undefined) {
          return { status: 'error', message: unsupportedValueMessage(name) };
        }
        values.push(value);
      }
      properties.push({ name, value: values });
      continue;
    }

    return { status: 'error', message: unsupportedValueMessage(name) };
  }

  return { status: 'valid', properties };
}
