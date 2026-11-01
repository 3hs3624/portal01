# Write Studio vendored dependencies

- KaTeX 0.16.22: `katex.min.js`, `katex.min.css`, `fonts/`. MIT license: `katex-LICENSE.txt`. Files are pinned copies of the published npm distribution, downloaded from jsDelivr over verified HTTPS.
- Mermaid 10.9.3: `mermaid.min.js`. MIT license: `mermaid-LICENSE.txt`. Pinned UMD npm distribution from jsDelivr over verified HTTPS. Configured with strict security and SVG text labels.
- `block-engine.js` retains its existing bundled libraries and licenses. The application adapter now exposes the bundled `Node` and `Extension` constructors and accepts optional additional extensions in `create()`. No editor package implementation was changed. Preserve these three adapter hooks when rebuilding/upgrading the bundle; custom blocks live in `../block-ui.js` and `../block-widgets.js`.
