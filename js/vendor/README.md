# Vendored three.js

`three.min.js` is **three.js r187** (npm `three@0.187.0`, MIT, see `three.LICENSE`), bundled into a
classic `<script>` that defines a global `THREE`. three.js now ships only as ES modules, and browsers
refuse to load modules from `file://`, so this bundle is what lets `index.html` work by double-click.

Rebuild (in any empty folder):

```bash
npm init -y
npm install --save-exact three@0.187.0 esbuild@0.28.2
npm audit signatures
echo "export * from 'three';" > entry.js
npx esbuild entry.js --bundle --format=iife --global-name=THREE --minify --legal-comments=eof --outfile=three.min.js
```
