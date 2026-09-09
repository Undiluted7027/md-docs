# Properties, section links, footnotes, and callouts

Markdown remains the complete document source. These features change only how the live preview
presents it.

## Properties

Put YAML properties at the very start of a document between `---` lines:

```yaml
---
status: Draft
priority: 2
published: false
due: 2026-09-09
tags:
  - docs
  - shared
---
```

Property values may be text, numbers, booleans, or flat lists of those values. Nested maps and
nested lists are not supported. Invalid or unsupported properties show an error in the properties
panel while the rest of the Markdown continues to render.

Properties are display-only data. Names such as `title`, `theme`, or `config` do not change the
document title or configure the renderer. Edit the YAML source to change a property.

## Section links

Each preview heading has a **Copy link** button. Generated IDs start with `document-heading-`, and
repeated headings receive stable numeric suffixes. Opening a copied URL scrolls to that heading,
including when collaborative content finishes loading after the page.

## Footnotes

Use ordinary Markdown footnotes. More than one reference may point to the same definition:

```markdown
This needs context.[^context] This points to it again.[^context]

[^context]: The shared footnote.
```

The preview includes a return link for every reference.

## Callouts

The preview recognizes GitHub-style note, tip, important, warning, and caution callouts:

```markdown
> [!NOTE]
> This is useful context.
```

The supported markers are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`, matched without
regard to case (`[!note]` also works, though uppercase is conventional). An unknown marker
remains an ordinary blockquote.
