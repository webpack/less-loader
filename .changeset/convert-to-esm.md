---
"less-loader": major
---

The package now ships native ESM as well as CommonJS. `"type": "module"` is set, and an `exports` map exposes `dist/esm/index.js` to `import` and `dist/cjs/index.js` to `require`. Less is loaded via dynamic `import()` instead of `require()`.
