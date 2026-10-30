/*
 * Zotero citations for articles.
 *
 * In the Markdown, a citation is written the Pandoc way (what the Obsidian "Zotero Integration"
 * plugin inserts):  [@farias2013]   [@farias2013, p. 12]   [@farias2013; @brooks2016]
 * The data comes from content/references.json, a "Better CSL JSON" export of the Zotero library
 * that Better BibTeX keeps up to date. Each citation becomes an APA-style (Author, Year) link to
 * the paper, and the cited works are listed under the references heading at the end.
 */
import fs from 'node:fs';
import path from 'node:path';

let library = null;
export function loadLibrary(root) {
  if (library) return library;
  library = new Map();
  const file = path.join(root, 'content/references.json');
  if (fs.existsSync(file)) {
    const items = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    for (const it of Array.isArray(items) ? items : items.items || []) {
      const key = it['citation-key'] || it.citationKey || it.id;
      if (key) library.set(String(key), it);
    }
  }
  return library;
}

/* ---------- names, years, links ---------- */
const family = a => a.literal || a.family || a.given || '';
function initials(given) {
  return String(given || '').split(/\s+/).filter(Boolean)
    .map(p => p.split('-').map(x => x[0] ? x[0].toUpperCase() + '.' : '').join('-')).join(' ');
}
const fullName = a => a.literal ? a.literal : [a.family, initials(a.given)].filter(Boolean).join(', ');
function authorsOf(it) { return it.author || it.editor || []; }
function year(it) {
  const d = it.issued || it['original-date'];
  const y = d && (d['date-parts'] && d['date-parts'][0] && d['date-parts'][0][0] || d.literal || d.raw);
  return y ? String(y).match(/\d{4}/)?.[0] || String(y) : 'n.d.';
}
function link(it) {
  if (it.DOI) { const doi = String(it.DOI).replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''); return { url: 'https://doi.org/' + doi, label: 'doi.org/' + doi }; }
  if (it.URL) return { url: it.URL, label: String(it.URL).replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') };
  return null;
}
/* text that goes inside Markdown: keep characters the converter treats as formatting literal */
const plain = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/[*~^`[\]]/g, '');

/* (Farias et al., 2013): one author, two with &, three or more et al. */
function inTextName(it) {
  const a = authorsOf(it);
  if (!a.length) return plain(it.title).split(' ').slice(0, 4).join(' ');
  if (a.length === 1) return family(a[0]);
  if (a.length === 2) return family(a[0]) + ' & ' + family(a[1]);
  return family(a[0]) + ' et al.';
}

/* APA reference, in the style of the existing articles */
function reference(it) {
  const a = authorsOf(it).map(fullName);
  let names = a.length <= 1 ? (a[0] || '') : a.length <= 20
    ? a.slice(0, -1).join(', ') + ', & ' + a[a.length - 1]
    : a.slice(0, 19).join(', ') + ', … ' + a[a.length - 1];
  if (!names) names = plain(it.publisher) || '';
  const y = year(it), t = plain(it.title), c = plain(it['container-title']);
  const book = /^(book|thesis|report)$/.test(it.type);
  let out = (names ? plain(names) + ' ' : '') + `(${y}). `;
  out += book ? `*${t}*.` : `${t}${/[.?!]$/.test(t) ? '' : '.'}`;
  if (!book && c) {
    out += ` *${c}*`;
    if (it.volume) out += `, ${plain(it.volume)}` + (it.issue ? `(${plain(it.issue)})` : '');
    const pages = it.page || it.number;
    if (pages) out += `, ${plain(String(pages).replace(/-/g, '–'))}`;
    out += '.';
  } else if (it.publisher && !/^(article-journal)$/.test(it.type)) out += ` ${plain(it.publisher)}.`;
  const l = link(it);
  if (l) out += ` [${l.label}](${l.url})`;
  return out;
}

/* ---------- the article body ---------- */
const HEADING = { ar: 'المصادر', en: 'References' };

export function applyCitations(body, lang, root, problems) {
  const lib = loadLibrary(root), used = new Map();
  const re = /\[((?:[^\]\[]*?;\s*)?-?@[^\]]+)\]/g;
  body = body.replace(re, (all, inside) => {
    const parts = inside.split(/\s*;\s*/).map(p => p.match(/^(-?)@([^\s,]+)\s*,?\s*(.*)$/));
    if (parts.some(p => !p)) return all;                         // not a citation
    const out = [];
    for (const [, noAuthor, key, locator] of parts) {
      const it = lib.get(key);
      if (!it) { problems.push(lib.size ? `citation [@${key}] is not in content/references.json` :
        `citation [@${key}] used, but content/references.json is missing (export it from Zotero)`); return all; }
      used.set(key, it);
      const text = (noAuthor ? '' : inTextName(it) + ', ') + year(it) + (locator ? ', ' + plain(locator) : '');
      const l = link(it);
      out.push(l ? `[${text}](${l.url})` : text);
    }
    return '(' + out.join('; ') + ')';
  });
  if (!used.size) return body;

  const refs = [...used.values()].sort((x, y) =>
    (family(authorsOf(x)[0] || {}) || plain(x.title)).localeCompare(family(authorsOf(y)[0] || {}) || plain(y.title), 'en') ||
    year(x).localeCompare(year(y)));
  const list = refs.map((it, i) => `${i + 1}. ${reference(it)}`).join('\n');
  const heading = new RegExp(`^##\\s+(${HEADING.ar}|${HEADING.en})\\s*$`, 'm');
  /* put the list under the references heading if the article has one, otherwise add the heading at the end */
  if (heading.test(body)) return body.replace(heading, h => h + '\n\n' + list + '\n');
  return body.replace(/\s*$/, '') + `\n\n## ${HEADING[lang] || HEADING.en}\n\n` + list + '\n';
}
