# Markdown math

The preview renders LaTeX-style math with KaTeX. The Markdown source remains
unchanged when it is synchronized, saved, or exported.

Use one dollar sign on each side for inline math:

```markdown
Euler's identity is $e^{i\pi} + 1 = 0$.
```

Put two dollar signs on separate lines around display math:

```markdown
$$
\int_0^1 x^2 \, dx
$$
```

Escape a dollar sign with a backslash when it should remain literal:

```markdown
The total is \$12.
```

An unmatched dollar sign stays as text. Two dollar signs in the same paragraph
can be interpreted as math delimiters, so currency values should be escaped when
another dollar sign appears later in that paragraph.

Invalid expressions appear as an error beside the surrounding preview content.
Commands that require trusted input are disabled, and rendered size and macro
expansion are limited.
