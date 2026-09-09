import type { HighlightLanguage } from './highlightCode.ts';

const languageAliases: Record<string, HighlightLanguage> = {
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  html: 'html',
  css: 'css',
  markdown: 'markdown',
  md: 'markdown',
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
  zsh: 'shellscript',
  python: 'python',
  py: 'python',
  sql: 'sql',
};

export function supportedHighlightLanguage(language: string) {
  return languageAliases[language.toLowerCase()];
}
