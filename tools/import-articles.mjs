#!/usr/bin/env node
/*
 * One-time import: turns the hand-made article pages into Markdown sources in content/articles/,
 * so they can be edited (in Obsidian or any editor) and republished by tools/build-articles.mjs.
 *
 *   node tools/import-articles.mjs            import every article that has no source yet
 *   node tools/import-articles.mjs --force    overwrite existing sources
 *
 * Imported sources use `layout: existing`: the page keeps its own design, styles and scripts and
 * only the text after the title is rebuilt. Paragraphs, headings, lists and quotes become plain
 * Markdown; anything else (interactive figures, specially styled lines) is kept as a ```html block.
 * Each converted block is rendered back and compared with the original, and falls back to HTML
 * if the two differ, so importing never changes what readers see.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const katex = require('katex');
require('katex/dist/contrib/mhchem.js');   // registers \ce on the same katex
const R = require(path.join(ROOT, 'ar/admin/render.js'));
R.setKatex(katex);
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const force = process.argv.includes('--force');

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', '#39': "'" };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
const text = h => decode(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const squash = s => s.replace(/\s+/g, '');

/* ---------- split a fragment into its top-level nodes ---------- */
const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track', 'param']);
function topNodes(html) {
  const nodes = []; let i = 0, depth = 0, start = 0;
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0].startsWith('<!--')) { if (depth === 0) { nodes.push({ text: html.slice(i, m.index) }); nodes.push({ comment: m[0] }); i = tagRe.lastIndex; } continue; }
    const [all, close, name, self] = m, n = name.toLowerCase();
    if (!close && (n === 'script' || n === 'style')) {             // skip their contents
      const end = html.toLowerCase().indexOf(`</${n}>`, tagRe.lastIndex);
      if (depth === 0) { nodes.push({ text: html.slice(i, m.index) }); start = m.index; }
      tagRe.lastIndex = end + n.length + 3;
      if (depth === 0) { nodes.push({ tag: n, html: html.slice(start, tagRe.lastIndex) }); i = tagRe.lastIndex; }
      continue;
    }
    if (close) {
      depth--;
      if (depth === 0) { nodes.push({ tag: nodes._open, html: html.slice(start, tagRe.lastIndex) }); i = tagRe.lastIndex; }
    } else if (self || VOID.has(n)) {
      if (depth === 0) { nodes.push({ text: html.slice(i, m.index) }); nodes.push({ tag: n, html: all }); i = tagRe.lastIndex; }
    } else {
      if (depth === 0) { nodes.push({ text: html.slice(i, m.index) }); start = m.index; nodes._open = n; }
      depth++;
    }
  }
  nodes.push({ text: html.slice(i) });
  return nodes.filter(x => !('text' in x) || x.text.trim());
}

/* ---------- HTML → the site's Markdown, or null when it can't be expressed ---------- */
function inlineMd(h) {
  let ok = true;
  const out = h.replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (all, close, name, attrs) => {
    name = name.toLowerCase();
    if (name === 'br') return '\n';
    if (name === 'strong' || name === 'b') return '**';
    if (name === 'em' || name === 'i') return '*';
    if (name === 'sub') return '~';
    if (name === 'sup') return '^';
    if (name === 'code') return '`';
    if (name === 'bdi') return '';        // the renderer adds it back around citations
    if (name === 'a') {
      if (close) return '\u0002';
      const href = (attrs.match(/href="([^"]*)"/) || [])[1];
      if (!href) { ok = false; return all; }
      return '\u0003' + decode(href) + '\u0003';
    }
    ok = false; return all;
  });
  if (!ok) return null;
  return decode(out)
    .replace(/\u0003([^\u0003]*)\u0003([\s\S]*?)\u0002/g, (_, href, t) => `[${t}](${href})`)
    .split('\n').map(l => l.trim()).join('\n').trim();
}
function blockMd(node) {
  const n = node.tag, inner = node.html.replace(/^<[^>]+>/, '').replace(/<\/[a-z0-9]+>\s*$/i, '');
  const style = squash((node.html.match(/^<[^>]+style="([^"]*)"/) || [])[1] || '');
  const plainP = /font-size:17px/.test(style) && !/font-weight|font-size:1[89]px/.test(style);
  if (n === 'p' && plainP) return inlineMd(inner);
  if (n === 'h2' || n === 'h3') { const t = inlineMd(inner); return t && !t.includes('\n') ? (n === 'h2' ? '## ' : '### ') + t : null; }
  if (n === 'ul' || n === 'ol') {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(x => inlineMd(x[1]));
    if (!items.length || items.some(x => x == null || x.includes('\n'))) return null;
    if (squash(inner.replace(/<li[^>]*>[\s\S]*?<\/li>/g, '')) !== '') return null;
    return items.map((t, i) => (n === 'ul' ? '- ' : `${i + 1}. `) + t).join('\n');
  }
  if (n === 'blockquote') { const t = inlineMd(inner); return t && !t.includes('\n') ? '> ' + t : null; }
  return null;
}

/* does the Markdown render to the same thing the reader saw? (same text, same tags, same links) */
const shape = h => (h = h.replace(/<\/?bdi[^>]*>/g, ''), {
  text: text(h),
  tags: [...h.matchAll(/<\/?([a-z0-9]+)/gi)].map(x => ({ b: 'strong', i: 'em' })[x[1].toLowerCase()] || x[1].toLowerCase()).join(','),
  links: [...h.matchAll(/href="([^"]*)"/g)].map(x => decode(x[1])).join(' '),
});
function same(orig, mdText, lang) {
  const a = shape(orig), b = shape(R.md(mdText, lang));
  return a.text === b.text && a.tags === b.tags && a.links === b.links;
}

/* ---------- one page ---------- */
function importPage(page) {
  const html = read(page);
  const lang = (html.match(/<html[^>]*\blang="([a-z]+)"/) || [])[1] || (page.startsWith('en/') ? 'en' : 'ar');
  const slug = path.basename(page, '.html');
  const src = `content/articles/${lang === 'en' ? 'en/' : ''}${slug}.md`;
  if (fs.existsSync(path.join(ROOT, src)) && !force) return console.log(`- ${src} exists, skipped`);

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const close = html.lastIndexOf('</article>'), end = html.lastIndexOf('</div>', close);
  if (!h1 || close < 0) return console.log(`✗ ${page}: no title/article found, skipped`);
  const title = text(h1[1]);
  const pageTitle = decode((html.match(/<title>([\s\S]*?)(?: \| [^<]*)?<\/title>/) || [])[1] || '').trim();
  let nodes = topNodes(html.slice(h1.index + h1[0].length, end));

  /* the lead paragraph (the summary, in larger grey type) becomes `summary` */
  let lead = null;
  const first = nodes.find(x => x.tag);
  if (first && first.tag === 'p' && /font-size:19px/.test(squash(first.html)) && /#52534C/i.test(first.html) && !/font-weight/.test(first.html)) {
    lead = text(first.html); nodes = nodes.filter(x => x !== first);
    nodes.leadNode = first;
  }

  /* summary and date as the home page and feed show them */
  const home = read(lang === 'ar' ? 'ar/index.html' : 'index.html');
  const href = lang === 'ar' ? '../' + page : page;
  const card = home.match(new RegExp(`<a href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</a>`));
  const cardSummary = card ? text([...card[1].matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].pop()?.[1] || '') : '';
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  /* if the card shows a different summary than the lead, keep both: the lead stays as HTML */
  if (lead && cardSummary && lead !== cardSummary) { nodes.unshift(nodes.leadNode); lead = null; }
  const summary = lead || cardSummary || desc;
  const feed = read(lang === 'ar' ? 'feed.xml' : 'feed-en.xml');
  const item = feed.match(new RegExp(`<link>${R.SITE}/${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</link>[\\s\\S]*?<pubDate>([^<]*)</pubDate>`));
  /* the month line above the title is what readers see; the feed date is used when it agrees */
  const label = text((html.match(/<div[^>]*IBM Plex Mono[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '');
  const mi = R.MONTHS[lang].findIndex(mn => label.includes(mn)), y = (label.match(/\d{4}/) || [])[0];
  let date = item ? new Date(item[1]) : null;
  if (mi >= 0 && y && !(date && date.getUTCMonth() === mi && date.getUTCFullYear() === +y)) date = new Date(Date.UTC(+y, mi, 1, 8));
  if (!date) date = new Date();
  const ymd = date.toISOString().slice(0, 10);

  /* body: Markdown where it renders the same, HTML blocks elsewhere */
  const parts = []; let raw = [], conv = 0, kept = 0;
  const flush = () => { if (raw.length) { parts.push('```html\n' + raw.join('\n').replace(/\n{2,}/g, '\n') + '\n```'); raw = []; } };
  for (const node of nodes) {
    if (node.comment) continue;
    if ('text' in node) { raw.push(node.text.trim()); kept++; continue; }
    const m = blockMd(node);
    if (m != null && same(node.html, m, lang)) { flush(); parts.push(m); conv++; }
    else { raw.push(node.html.replace(/^\s+/gm, s => s)); kept++; }
  }
  flush();

  const notes = [];
  const fm = R.sourceMd({ title, summary, lang, date: ymd, slug, body: parts.join('\n\n') })
    .replace('status: published\n', 'status: published\nlayout: existing\n' + (lead ? '' : 'lead: false\n') +
      (pageTitle && pageTitle !== title ? `page_title: "${pageTitle.replace(/"/g, '\\"')}"\n` : ''));
  fs.mkdirSync(path.dirname(path.join(ROOT, src)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, src), fm);
  console.log(`✓ ${page} → ${src}  (${conv} Markdown blocks, ${kept} kept as HTML)${notes.length ? '  note: ' + notes.join('; ') : ''}`);
}

const pages = ['articles', 'en/articles'].flatMap(d =>
  fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).map(f => `${d}/${f}`) : []);
pages.forEach(importPage);
