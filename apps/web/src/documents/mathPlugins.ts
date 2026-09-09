import type { Options as KatexOptions } from 'rehype-katex';
import type { PluggableList } from 'unified';

export interface MathPlugins {
  remark: PluggableList;
  rehype: PluggableList;
}

// A `$` anywhere is a deliberate over-approximation of a math delimiter: it can
// load KaTeX for a document that only mentions a price, which is harmless. It
// never misses real math.
export function containsMathDelimiter(source: string): boolean {
  return source.includes('$');
}

// Documents are untrusted. KaTeX blocks commands that need trust, caps visual
// dimensions, and stops recursive macros after a bounded amount of work.
const katexOptions: KatexOptions = {
  trust: false,
  maxExpand: 1000,
  maxSize: 20,
  errorColor: '#9b2c2c',
};

let cache: Promise<MathPlugins> | undefined;

/**
 * Loads remark-math, rehype-katex, and the KaTeX stylesheet on first use, so a
 * document with no math never downloads the ~300 KB equation renderer. The
 * `katex` dependency exists only for that stylesheet; its version must match the
 * one rehype-katex renders with (currently 0.16.x).
 */
export function loadMathPlugins(): Promise<MathPlugins> {
  cache ??= (async () => {
    const [{ default: remarkMath }, { default: rehypeKatex }] = await Promise.all([
      import('remark-math'),
      import('rehype-katex'),
    ]);
    await import('katex/dist/katex.min.css');
    return {
      remark: [remarkMath],
      rehype: [[rehypeKatex, katexOptions]],
    };
  })();
  return cache;
}
