import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import css from '@shikijs/langs/css';
import html from '@shikijs/langs/html';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import markdown from '@shikijs/langs/markdown';
import python from '@shikijs/langs/python';
import shellscript from '@shikijs/langs/shellscript';
import sql from '@shikijs/langs/sql';
import typescript from '@shikijs/langs/typescript';
import githubDark from '@shikijs/themes/github-dark';

const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [typescript, javascript, json, html, css, markdown, shellscript, python, sql],
  themes: [githubDark],
});

export async function highlightCode(source: string, language: HighlightLanguage) {
  const instance = await highlighter;
  return instance.codeToHtml(source, { lang: language, theme: 'github-dark' });
}

export type HighlightLanguage =
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'html'
  | 'css'
  | 'markdown'
  | 'shellscript'
  | 'python'
  | 'sql';
