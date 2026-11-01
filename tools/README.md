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

## Floating table of contents

Every article page loads [`../assets/toc.js`](../assets/toc.js). It turns the article's `##` / `###`
headings (h2/h3) into a round button in the corner that opens a list of the sections, with a ring
that fills as the reader scrolls. It only appears when an article has 3 or more headings, so short
articles look the same as before. The template (`render.js`) adds the script to new articles, and
the build adds it to `layout: existing` pages if it is missing. Add `data-toc="skip"` to a heading
to leave it out, or `data-toc="off"` on `<article>` to turn the list off for one article.
