# WASM LaTeX Tools

Run LaTeX tools (texcount, latexdiff, latexpand, tex-fmt) directly in your browser using WebAssembly. This package bundles WebPerl WASM for Perl-based tools and Rust WASM (wasm-bindgen) for tex-fmt, providing a complete LaTeX toolchain without server-side dependencies.

## Features

- **TexCount**: Count words in LaTeX documents with support for multi-file projects
- **LaTeX Diff**: Generate diff documents showing changes between two LaTeX files
- **Latexpand**: Expand LaTeX documents by inlining included files
- **TeX-Fmt**: Format and beautify LaTeX documents using Rust WASM (wasm-bindgen)

All tools run entirely in the browser with no server required.

## Installation

```bash
npm install wasm-latex-tools
```

## Setup

Copy the required WASM and Perl assets to your public directory:

```bash
npx wasm-latex-tools copy-assets
```

This copies WebAssembly files and Perl scripts to `./public/core/` by default.

For a custom location:

```bash
npx wasm-latex-tools copy-assets ./static/wasm
```

## Usage

### Basic Example

```typescript
import { WebPerlRunner, TexCount, TexFmt } from 'wasm-latex-tools';

// Initialize the WebPerl runner
const runner = new WebPerlRunner();
await runner.initialize();

// Count words in a LaTeX document
const texCount = new TexCount(runner);
const countResult = await texCount.count({
  input: '\\documentclass{article}\\n\\begin{document}\\nHello World\\n\\end{document}'
});

console.log(texCount.parseOutput(countResult.output));

// Format a LaTeX document with tex-fmt (wasm-bindgen)
const texFmt = new TexFmt();
const formatResult = await texFmt.format({
  input: '\\documentclass{article}\\n\\begin{document}\\nHello World\\n\\end{document}',
  wrap: true,
  wraplen: 80
});

console.log(formatResult.output);
```

### Configuration

If you copied assets to a custom location, configure the paths:

```typescript
const runner = new WebPerlRunner({
  webperlBasePath: '/wasm/webperl',
  perlScriptsPath: '/wasm/perl'
});
```

### TeXcount with Multi-File Support

```typescript
const texCount = new TexCount(runner);

const result = await texCount.count({
  input: mainFileContent,
  includeFiles: true,
  merge: false,
  additionalFiles: [
    { path: 'chapter1.tex', content: chapter1Content },
    { path: 'chapter2.tex', content: chapter2Content }
  ]
});

const parsed = texCount.parseOutput(result.output);
console.log(`Words: ${parsed.words}, Headers: ${parsed.headers}`);
```

### Latexdiff

```typescript
import { LatexDiff } from 'wasm-latex-tools';

const latexDiff = new LatexDiff(runner);

const result = await latexDiff.diff(oldContent, newContent, {
  type: 'UNDERLINE',
  flatten: true
});

console.log(result.output); // Diff LaTeX document
```

### Latexpand

```typescript
import { Latexpand } from 'wasm-latex-tools';

const latexpand = new Latexpand(runner);

const result = await latexpand.expand({
  input: mainFileContent,
  keepComments: true,
  additionalFiles: [
    { path: 'intro.tex', content: introContent },
    { path: 'conclusion.tex', content: conclusionContent }
  ]
});

console.log(result.output); // Expanded LaTeX document
```

### TeX-Fmt Options

```typescript
const texFmt = new TexFmt();

const result = await texFmt.format({
  input: latexContent,
  wrap: true,
  wraplen: 100,
  tabsize: 4,
  usetabs: false
});
```

## API Reference

### WebPerlRunner

The core runner for Perl-based tools.

```typescript
const runner = new WebPerlRunner({
  webperlBasePath?: string;  // Default: '/core/webperl'
  perlScriptsPath?: string;  // Default: '/core/perl'
  verbose?: boolean;         // Default: false
});

await runner.initialize();
```

### TeXcount

Count words in LaTeX documents.

```typescript
const texCount = new TexCount(runner, verbose?);

const result = await texCount.count({
  input: string;
  brief?: boolean;
  total?: boolean;
  sum?: boolean;
  verbose?: number;
  includeFiles?: boolean;
  merge?: boolean;
  additionalFiles?: { path: string; content: string }[];
});

const parsed = texCount.parseOutput(result.output);
// Returns: { words: number, headers: number, captions: number, raw: string }
```

### Latexdiff

Generate diff documents between two LaTeX files.

```typescript
const latexDiff = new LatexDiff(runner, verbose?);

const result = await latexDiff.diff(oldContent, newContent, {
  type?: 'UNDERLINE' | 'CTRADITIONAL' | 'CFONT' | 'CHANGEBAR';
  subtype?: string;
  floattype?: 'FLOATSAFE' | 'IDENTICAL';
  encoding?: string;
  mathMarkup?: number;
  allowSpaces?: boolean;
  flatten?: boolean;
});
```

### Latexpand

Expand LaTeX documents by inlining includes.

```typescript
const latexpand = new Latexpand(runner, verbose?);

const result = await latexpand.expand({
  input: string;
  keepComments?: boolean;
  emptyComments?: boolean;
  expandUsepackage?: boolean;
  makeatletter?: boolean;
  showGraphics?: boolean;
  fatal?: boolean;
  additionalFiles?: { path: string; content: string }[];
});
```

### TeX-Fmt

Format LaTeX documents with Rust WASM (wasm-bindgen), with **no** runner needed.

```typescript
const texFmt = new TexFmt(verbose?, wasmBasePath?);

const result = await texFmt.format({
  input: string;
  wrap?: boolean;
  wraplen?: number;
  tabsize?: number;
  usetabs?: boolean;
});
```

## Framework Integration

### Next.js

```bash
npx wasm-latex-tools copy-assets ./public/core
```

```typescript
// pages/index.tsx or app/page.tsx
'use client'; // For App Router

import { WebPerlRunner, TexCount } from 'wasm-latex-tools';
import { useEffect, useState } from 'react';

export default function Page() {
  const [runner, setRunner] = useState<WebPerlRunner | null>(null);

  useEffect(() => {
    const initRunner = async () => {
      const r = new WebPerlRunner();
      await r.initialize();
      setRunner(r);
    };
    initRunner();
  }, []);

  // Use runner...
}
```

### Vite

```bash
npx wasm-latex-tools copy-assets ./public/core
```

```typescript
import { WebPerlRunner, TexCount } from 'wasm-latex-tools';

const runner = new WebPerlRunner();
await runner.initialize();
```

### Create React App

```bash
npx wasm-latex-tools copy-assets ./public/core
```

Same usage as Vite example above.

### Custom Setup

For custom static file servers, copy assets to your static directory and configure paths:

```bash
npx wasm-latex-tools copy-assets ./static/latex-tools
```

```typescript
const runner = new WebPerlRunner({
  webperlBasePath: '/latex-tools/webperl',
  perlScriptsPath: '/latex-tools/perl'
});
```

## Building from Source

```bash
git clone https://github.com/TeXlyre/wasm-latex-tools.git
cd wasm-latex-tools
npm install
npm run build
```

## Examples

### Running the Demo

To run the interactive demo locally:

```bash
npm install
npm run build
npm run example
```

Then open `http://localhost:3000` in your browser.

### GitHub Pages Demo

To run the GitHub Pages example:

```bash
npm run build:pages-example
npm run pages-example
```

## Asset Management

### Copy Command

```bash
# Default location (./public/core)
npx wasm-latex-tools copy-assets

# Custom location
npx wasm-latex-tools copy-assets ./static/wasm

# In package.json scripts
{
  "scripts": {
    "postinstall": "wasm-latex-tools copy-assets"
  }
}
```

### Asset Structure

After running `copy-assets`, your directory will contain:

```
public/core/
├── webperl/
│   ├── emperl.js
│   ├── emperl.wasm
│   ├── perlrunner.html
│   └── webperl.js
├── perl/
│   ├── texcount.pl
│   ├── latexdiff.pl
│   └── latexpand.pl
└── texfmt/
    ├── tex_fmt.js
    └── tex_fmt_bg.wasm
```

## Performance Considerations

- **First Load**: WebPerl WASM initialization takes 1-2 seconds
- **Subsequent Runs**: Tool execution is fast (milliseconds for small documents)
- **Large Documents**: Multi-file projects with hundreds of pages process in seconds
- **Memory**: Each tool creates temporary files in WASM filesystem


## Troubleshooting

### Assets Not Found (404)

Ensure you've run the copy command and configured paths correctly:

```bash
npx wasm-latex-tools copy-assets
```

### CORS Errors

Make sure your development server serves the assets directory. Most frameworks handle this automatically for the `public/` directory.

### Timeout Errors

For very large documents, you may need to increase timeouts. The default is 60 seconds for script execution.

### Memory Issues

WebPerl runs in WASM with limited memory. For very large projects, consider splitting into smaller chunks.

## Acknowledgments

- [WebPerl](http://webperl.zero-g.net/) - Perl 5 compiled to WebAssembly
- [tex-fmt](https://github.com/WGUNDERWOOD/tex-fmt) - LaTeX formatter in Rust
- [texcount](https://ctan.org/pkg/texcount) - Word counting for LaTeX in Perl
- [latexdiff](https://ctan.org/pkg/latexdiff) - LaTeX diff tool in Perl
- [latexpand](https://ctan.org/pkg/latexpand) - LaTeX expander in Perl


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

AGPL-3.0 License © 2025 [Fares Abawi](https://abawi.me)

