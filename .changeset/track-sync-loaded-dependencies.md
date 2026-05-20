---
"less-loader": patch
---

Track files loaded synchronously by Less (e.g. `data-uri()` and custom functions installed via `@plugin`) as webpack file dependencies. Previously these reads were delegated to Less's default file manager and never registered with webpack, so persistent caching could keep a stale build when only the sync-loaded file changed. See [#492](https://github.com/webpack/less-loader/issues/492).
