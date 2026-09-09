# Landing page design

The landing page uses graphite, citron, Manrope, and a folded-paper Markdown symbol.
Obsidian's product-led hierarchy and StackEdit's concrete editor examples informed
the layout. The sample uses CodeMirror and the same Markdown renderer as the
collaborative workspace; it does not create or save a document.

## Implementation

The feature lives in `apps/web/src/landing`. Motion handles the headline, section,
and footer entrances. The artwork's pointer tilt uses motion values rather than
React state. Reduced-motion preferences disable the entrances and tilt. CSS
handles responsive layout, hover feedback, and system light/dark themes.

The large footer wordmark scales to its container width. The sketches and favicon
are small SVGs, with no external icon dependency. The document workspace keeps its
existing appearance and behavior.

## Artwork

`apps/web/public/landing/markdown-sculpture.png` is the original generated asset.
The page loads the approximately 64 KB WebP version beside it. The PNG is used for
social metadata. Both originate from the built-in image-generation tool.

Generation prompt:

> Create a premium tactile 3D illustration for a collaborative Markdown app: a
> recognizable hash symbol constructed from four broad, interwoven folded paper
> strips. Use warm off-white, acid citron (#d8f86f), silver grey, and dark graphite.
> Show physically plausible over-under joinery, turned paper edges, fine matte
> paper grain, soft directional studio lighting, and realistic shadows. Center the
> sculpture on a matte deep graphite (#151715) background with generous negative
> space. No additional text, objects, people, screens, logos, glow, or watermark.

References: https://obsidian.md/ and https://stackedit.io/.
