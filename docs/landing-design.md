# Landing page design

This slice added the landing page and brought the document screens onto the same
visual language: graphite, citron, Manrope, and a folded-paper Markdown symbol.
Obsidian's product-led hierarchy and StackEdit's concrete editor examples informed
the layout. The landing sample uses CodeMirror and the same Markdown renderer as
the collaborative workspace; it does not create or save a document.

## Implementation

The feature lives in `apps/web/src/landing`. Motion handles the headline, section,
and footer entrances. The artwork's pointer tilt uses motion values rather than
React state. Reduced-motion preferences disable the entrances and tilt. CSS
handles responsive layout, hover feedback, and system light/dark themes.

The interactive editor example imports CodeMirror and the Markdown renderer
(~700 KB), so it is not loaded until that section approaches the viewport. A
visitor who reads only the hero never downloads it.

The large footer wordmark scales to its container width. The sketches and favicon
are small SVGs, with no external icon dependency.

The document workspace, join, and unavailable screens were restyled to share this
palette, typography, and chrome (`apps/web/src/documents/DocumentChrome.tsx`,
`documents.css`). Their collaboration, saving, export, and access behavior is
unchanged; only the presentation moved.

## Artwork

The artwork came from the built-in image-generation tool. The page loads
`markdown-sculpture.webp` (about 64 KB); social metadata points at
`markdown-sculpture.jpg` (1200 px wide, about 180 KB) because most scrapers do
not accept WebP. The lossless original is not kept in the repo; regenerate it
from the prompt below if a larger source is needed.

Generation prompt:

> Create a premium tactile 3D illustration for a collaborative Markdown app: a
> recognizable hash symbol constructed from four broad, interwoven folded paper
> strips. Use warm off-white, acid citron (#d8f86f), silver grey, and dark graphite.
> Show physically plausible over-under joinery, turned paper edges, fine matte
> paper grain, soft directional studio lighting, and realistic shadows. Center the
> sculpture on a matte deep graphite (#151715) background with generous negative
> space. No additional text, objects, people, screens, logos, glow, or watermark.

References: https://obsidian.md/ and https://stackedit.io/.
