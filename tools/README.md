# Site tools

Articles are written as Markdown in `content/articles/` (Arabic) and `content/articles/en/`
(English). The writing guide (Arabic) is in [`content/README.md`](../content/README.md).

| File | What it does |
|---|---|
| `../ar/admin/render.js` | The article template and Markdown converter. Shared by the admin page (`ar/admin/new.html`) and the build, so both produce the same page. |
| `build-articles.mjs` | Builds article pages from Markdown, adds/updates the home-page card and RSS item. Skips `status: draft`. |
| `import-articles.mjs` | One-time import of the hand-made article pages into Markdown (`layout: existing`). Every converted block is checked against the original and falls back to raw HTML if it would render differently. |
| `../.github/workflows/articles.yml` | Runs the build when files under `content/articles/` are pushed to `main`, then commits the result. "Run workflow" with *all* rebuilds every article. |

```sh
npm install --prefix tools                                   # once (KaTeX)
node tools/build-articles.mjs content/articles/x.md          # build one article
node tools/build-articles.mjs --check content/articles/x.md  # validate only
node tools/build-articles.mjs --all                          # rebuild everything
```
