import type { Mermaid } from 'mermaid';

let diagramNumber = 0;
let mermaidModule: Promise<Mermaid> | undefined;

function loadMermaid() {
  mermaidModule ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
      maxTextSize: 50_000,
      maxEdges: 500,
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: '#1b1e1a',
        primaryColor: '#252b20',
        primaryTextColor: '#f3f5ed',
        primaryBorderColor: '#d8f86f',
        secondaryColor: '#30382a',
        secondaryTextColor: '#f3f5ed',
        secondaryBorderColor: '#879958',
        tertiaryColor: '#20251d',
        tertiaryTextColor: '#f3f5ed',
        tertiaryBorderColor: '#59634f',
        lineColor: '#a7b09e',
        textColor: '#f3f5ed',
        noteBkgColor: '#30382a',
        noteTextColor: '#f3f5ed',
        noteBorderColor: '#879958',
        clusterBkg: '#20251d',
        clusterBorder: '#59634f',
        edgeLabelBackground: '#1b1e1a',
        fontFamily: 'Manrope, system-ui, sans-serif',
      },
    });
    return mermaid;
  });
  return mermaidModule;
}

export function hasMermaidConfiguration(source: string) {
  const startsWithFrontmatter = /^\s*---(?:\r?\n|$)/u.test(source);
  const containsDirective = /%%\s*\{/u.test(source);
  return startsWithFrontmatter || containsDirective;
}

export async function renderMermaid(source: string) {
  if (hasMermaidConfiguration(source)) {
    throw new Error('Document-supplied Mermaid configuration is disabled');
  }

  const mermaid = await loadMermaid();

  diagramNumber += 1;
  const { svg } = await mermaid.render(`md-docs-diagram-${String(diagramNumber)}`, source);
  // Mermaid also returns an event binder. We intentionally leave it unused so
  // document-authored click directives cannot attach browser behavior.
  return svg;
}
