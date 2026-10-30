#!/usr/bin/env node
/*
 * Builds article pages from Markdown sources in content/articles/.
 *
 *   node tools/build-articles.mjs content/articles/my-article.md ...   build these files
 *   node tools/build-articles.mjs --all                               build every source
 *   node tools/build-articles.mjs --check ...                         only validate, write nothing
 *
 * For each source it writes the article page (articles/<slug>.html or en/articles/<slug>.html),
 * then adds or updates the card on the home page and the item in the RSS feed. Sources with
 * `status: draft` are skipped. The HTML comes from ar/admin/render.js, the same code the admin
 * page uses, so a page looks the same whichever way it was published.
 *
 * Source format (Obsidian-friendly):
 *   ---
 *   title: "…"
 *   summary: "…"          one line, shown under the title, on the card and in RSS
 *   lang: ar | en         defaults to en for files under content/articles/en/, else ar
 *   date: 2026-10-30
 *   slug: my-article      optional: from the file name, or else the title (Arabic is translated);
 *                         a generated slug is written back into the file so the URL stays fixed
 *   status: published | draft
 *   ---
 *   Markdown body: ## / ###, **bold**, *italic*, H~2~O, m^2^, lists, > quotes, [text](url),
 *   ![caption](url), $math$, $$block math$$, $\ce{…}$, ```html raw blocks```.
 *   Obsidian extras: ![[image.png|caption]] is copied to images/ and shown; [[note]] becomes
 *   plain text; %% comments %% and <!-- comments --> are dropped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { applyCitations } from './citations.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const katex = require('katex');
require('katex/dist/contrib/mhchem.js');   // registers \ce on the same katex
const R = require(path.join(ROOT, 'ar/admin/render.js'));
R.setKatex(katex);

const SRC_DIR = path.join(ROOT, 'content/articles');
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

/* ---------- front matter ---------- */
function unquote(v) {
  v = v.trim();
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  return v.replace(/\s+#.*$/, '');
}
function parse(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);   // nested lists (tags etc.) are ignored
    if (kv && kv[2] !== '') meta[kv[1]] = unquote(kv[2]);
  }
  return { meta, body: text.slice(m[0].length) };
}

/* ---------- Obsidian syntax → the site's Markdown ---------- */
let allFiles = null;
function findFile(name) {
  if (!allFiles) {
    allFiles = [];
    const walk = d => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else allFiles.push(p);
      }
    };
    walk(ROOT);
  }
  const base = path.basename(name);
  return allFiles.find(p => rel(p) === name) || allFiles.find(p => path.basename(p) === base);
}
function obsidian(body, problems) {
  body = body.replace(/%%[\s\S]*?%%/g, '').replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, file, cap) => {
    const found = findFile(file.trim());
    if (!found) { problems.push(`image not found: ${file}`); return ''; }
    let target = rel(found);
    if (!target.startsWith('images/')) {
      target = 'images/' + path.basename(found).toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      fs.copyFileSync(found, path.join(ROOT, target));
    }
    const caption = cap && !/^\d+(x\d+)?$/.test(cap.trim()) ? cap.trim() : '';   // |300 is an Obsidian size, not a caption
    return `![${caption}](/${target})`;
  });
  body = body.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  return body.replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- the file name in the URL, from the title (same steps as the admin page) ---------- */
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const TR = {'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh',
  'ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k',
  'ل':'l','م':'m','ن':'n','ه':'h','ة':'a','و':'w','ؤ':'w','ي':'y','ى':'a','ئ':'y','ء':''};
const transliterate = s => s.replace(/[\u0600-\u06ff]/g, c => TR[c] ?? '');
async function slugFromTitle(title) {
  if (!/[\u0600-\u06ff]/.test(title)) return slugify(title);
  try {   // Arabic titles are translated, like the admin page does
    const r = await fetch('https://api.mymemory.translated.net/get?langpair=ar|en&q=' + encodeURIComponent(title),
      { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    const en = d && d.responseData && d.responseData.translatedText;
    if (d.responseStatus == 200 && en && slugify(en)) return slugify(en);
  } catch (e) { /* fall back below */ }
  return slugify(transliterate(title));
}
/* when the source has no usable slug, pick one and write it into the file, so it never changes later */
async function ensureSlug(a) {
  if (a.slugGiven || /^[A-Za-z0-9_-]+$/.test(a.slug) || !a.title) return;
  let slug = await slugFromTitle(a.title) || 'article';
  const taken = s => fs.existsSync(path.join(ROOT, R.articlePath({ ...a, slug: s })));
  for (let i = 2; taken(slug); i++) slug = slug.replace(/-\d+$/, '') + '-' + i;
  a.slug = slug;
  const abs = path.join(ROOT, a.file);
  const text = fs.readFileSync(abs, 'utf8');
  fs.writeFileSync(abs, /^\uFEFF?---\r?\n/.test(text)
    ? text.replace(/^(\uFEFF?---\r?\n)/, `$1slug: ${slug}\n`)
    : `---\nslug: ${slug}\n---\n\n${text}`);
  console.log(`  ${a.file}: no slug given, using "${slug}" (saved in the file)`);
}

/* ---------- one article ---------- */
function load(file) {
  const abs = path.resolve(ROOT, file);
  const { meta, body } = parse(fs.readFileSync(abs, 'utf8'));
  const problems = [];
  const inEn = rel(abs).startsWith('content/articles/en/');
  const a = {
    file: rel(abs),
    title: meta.title || '',
    summary: meta.summary || '',
    lang: meta.lang || (inEn ? 'en' : 'ar'),
    date: meta.date || '',
    slug: meta.slug || path.basename(abs, '.md'),
    slugGiven: !!meta.slug,
    status: (meta.status || 'published').toLowerCase(),
    layout: meta.layout || 'standard',
    pageTitle: meta.page_title || '',
    lead: String(meta.lead || 'true').toLowerCase() !== 'false',   // show the summary under the title
  };
  if (a.status === 'draft') return a;
  a.body = applyCitations(obsidian(body, problems), a.lang, ROOT, problems);
  if (!a.title) problems.push('title is missing');
  if (!a.summary) problems.push('summary is missing');
  if (!a.body) problems.push('the article has no text');
  if (!/^(ar|en)$/.test(a.lang)) problems.push(`lang must be ar or en, not "${a.lang}"`);
  const d = a.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!d) problems.push(`date must look like 2026-10-30, not "${a.date}"`);
  else a.dateObj = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3], 8, 0, 0));
  a.problems = problems;
  return a;
}

/*
 * `layout: existing` (set on articles imported from the hand-made pages): keep the page as it
 * is (its own styles, scripts, language links) and only replace the title and the text
 * after it, so editing an old article never loses what the template can't express.
 */
function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);
  return html.replace(re, (_, a, b) => a + R.esc(value) + b);
}
function existingHtml(a) {
  const page = R.articlePath(a);
  if (!fs.existsSync(path.join(ROOT, page))) throw new Error(`layout: existing, but ${page} does not exist`);
  let html = read(page);
  const h1 = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
  const close = html.lastIndexOf('</article>');
  const end = close < 0 ? -1 : html.lastIndexOf('</div>', close);
  if (!h1 || end < 0) throw new Error(`could not find the article text in ${page}`);
  const start = h1.index + h1[0].length;
  const newH1 = h1[0].replace(/>[\s\S]*<\/h1>$/, '>' + R.esc(a.title) + '</h1>');
  const lead = a.lead ? `\n    <p style="${R.S(a.lang).lead}">${R.esc(a.summary)}</p>\n` : '\n';
  html = html.slice(0, h1.index) + newH1 + lead + R.md(a.body, a.lang) + '\n  ' + html.slice(end);
  const pageTitle = a.pageTitle || a.title;   // the browser-tab title may differ from the heading
  html = html.replace(/<title>[\s\S]*?( \| [^<]*)?<\/title>/, (_, suffix) => '<title>' + R.esc(pageTitle) + (suffix || '') + '</title>');
  html = setMeta(html, 'name', 'description', a.summary);
  html = setMeta(html, 'property', 'og:title', pageTitle);
  html = setMeta(html, 'property', 'og:description', a.summary);
  if (R.hasMath(a.body) && !html.includes('katex.min.css'))
    html = html.replace('</head>', `<link rel="stylesheet" href="${R.KATEX_CSS}">\n</head>`);
  return html;
}

function build(a, check) {
  R.state.mathError = null;
  const html = a.layout === 'existing' ? existingHtml(a) : R.articleHtml(a);
  if (R.state.mathError) throw new Error(`could not read the equation: ${R.state.mathError}`);
  if (check) return;
  const page = R.articlePath(a);
  fs.mkdirSync(path.dirname(path.join(ROOT, page)), { recursive: true });
  write(page, html);
  const home = a.lang === 'ar' ? 'ar/index.html' : 'index.html';
  const feed = a.lang === 'ar' ? 'feed.xml' : 'feed-en.xml';
  write(home, R.upsertCard(read(home), a));
  write(feed, R.upsertFeedItem(read(feed), a));
  return page;
}

/* ---------- command line ---------- */
const args = process.argv.slice(2);
const check = args.includes('--check');
let files = args.filter(x => !x.startsWith('--'));
if (args.includes('--all')) {
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []) : [];
  files = walk(SRC_DIR);
}
files = files.filter(f => f.endsWith('.md') && path.basename(f).toLowerCase() !== 'readme.md');
if (!files.length) { console.log('No article sources to build.'); process.exit(0); }

let failed = 0;
for (const f of files) {
  if (!fs.existsSync(path.resolve(ROOT, f))) { console.log(`- ${f}: deleted, nothing to build`); continue; }
  try {
    const a = load(f);
    if (a.status === 'draft') { console.log(`- ${a.file}: draft, skipped`); continue; }
    if (!check) await ensureSlug(a);
    if (!/^[A-Za-z0-9_-]+$/.test(a.slug)) a.problems.push(`slug "${a.slug}" may only use letters, numbers, - and _`);
    if (a.problems.length) throw new Error(a.problems.join('; '));
    const page = build(a, check);
    console.log(`✓ ${a.file}${page ? ' → ' + page : ' (ok)'}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${f}: ${e.message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error file=${f}::${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
