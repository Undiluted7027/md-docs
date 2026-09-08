const MAX_FILENAME_LENGTH = 80;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const FORBIDDEN_FILENAME_CHARACTERS = '<>:"/\\|?*';

interface MarkdownExport {
  filename: string;
  blob: Blob;
}

/** Creates the exact UTF-8 file that the download action will give the user. */
export function createMarkdownExport(title: string, source: string): MarkdownExport {
  return {
    filename: markdownFilename(title),
    blob: new Blob([source], { type: 'text/markdown;charset=utf-8' }),
  };
}

export function markdownFilename(title: string): string {
  const withoutExtension = title.normalize('NFKC').trim().replace(/\.md$/i, '');
  const safeTitle = replaceUnsafeCharacters(withoutExtension)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  // Cap the length, then trim again: the cut can land on a separator.
  const shortenedTitle = safeTitle.slice(0, MAX_FILENAME_LENGTH).replace(/[.-]+$/g, '');
  const filename =
    !shortenedTitle || WINDOWS_RESERVED_NAME.test(shortenedTitle) ? 'document' : shortenedTitle;
  return `${filename}.md`;
}

function replaceUnsafeCharacters(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    const isControlCharacter = codePoint !== undefined && (codePoint < 32 || codePoint === 127);
    return isControlCharacter || FORBIDDEN_FILENAME_CHARACTERS.includes(character)
      ? '-'
      : character;
  }).join('');
}

/** Downloads the current in-memory Markdown, whether or not it has been saved. */
export function downloadMarkdown(title: string, source: string): void {
  const exported = createMarkdownExport(title, source);
  const url = URL.createObjectURL(exported.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exported.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
