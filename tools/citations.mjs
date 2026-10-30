/*
 * Zotero citations for articles.
 *
 * In the Markdown, a citation is written the Pandoc way (what the Obsidian "Zotero Integration"
 * plugin inserts):  [@farias2013]   [@farias2013, p. 12]   [@farias2013; @brooks2016]
 * The data comes from content/references.json, a "Better CSL JSON" export of the Zotero library
 * that Better BibTeX keeps up to date. By default (IEEE) each citation becomes a number [1] linked to
 * a numbered list under the references heading; `citation_style: apa` gives (Author, Year) instead.
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
const plain = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/[*~^`[\]]/g, '')
  /* Zotero keeps rich text as HTML tags: SnO<sub>2</sub>, <i>Danio rerio</i> */
  .replace(/<sub>([^<]*)<\/sub>/gi, '~$1~').replace(/<sup>([^<]*)<\/sup>/gi, '^$1^')
  .replace(/<(i|em)>([^<]*)<\/\1>/gi, '*$2*').replace(/<(b|strong)>([^<]*)<\/\1>/gi, '**$2**')
  .replace(/<[^>]+>/g, '');
/* the same, as plain text (for the in-text name, where formatting is not wanted) */
const bare = s => plain(s).replace(/[*~^]/g, '');

/* (Farias et al., 2013): one author, two with &, three or more et al. */
function inTextName(it) {
  const a = authorsOf(it);
  if (!a.length) return bare(it.title).split(' ').slice(0, 4).join(' ');
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

/* ---------- IEEE (the default): [1] in the text, numbered list in order of first citation ---------- */
const MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
/* web pages and news carry the full date (Jun. 12, 2025); journal articles only the year */
function ieeeDate(it) {
  const p = it.issued && it.issued['date-parts'] && it.issued['date-parts'][0];
  if (!p || !p[1] || /^article-journal$|^book$|^chapter$/.test(it.type)) return year(it);
  return MON[p[1] - 1] + (p[2] ? ' ' + p[2] + ',' : '') + ' ' + p[0];
}
const ieeeName = a => a.literal ? a.literal : [initials(a.given), a.family].filter(Boolean).join(' ');
function ieeeAuthors(it) {
  const a = authorsOf(it).map(ieeeName);
  if (a.length > 6) return a[0] + ' et al.';
  if (a.length <= 2) return a.join(' and ');
  return a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
}
function ieeeReference(it) {
  const who = plain(ieeeAuthors(it)), t = plain(it.title), c = plain(it['container-title']), y = year(it);
  const book = /^(book|thesis|report)$/.test(it.type);
  const parts = [];
  if (book) {
    parts.push((who ? who + ', ' : '') + `*${t}*.`);
    const tail = [plain(it.publisher), y].filter(Boolean).join(', ');
    if (tail) parts.push(tail + (it.DOI ? ',' : '.'));
  } else {
    let head = (who ? who + ', ' : '') + `“${t},”`;
    const bits = [];
    if (c) bits.push(`*${c}*`);
    if (it.volume) bits.push(`vol. ${plain(it.volume)}`);
    if (it.issue) bits.push(`no. ${plain(it.issue)}`);
    const pg = it.page || it.number;
    if (pg) bits.push((/[-–]/.test(pg) ? 'pp. ' : 'p. ') + plain(String(pg).replace(/-/g, '–')));
    bits.push(ieeeDate(it));
    parts.push(head + ' ' + bits.join(', ') + (it.DOI ? ',' : '.'));
  }
  const l = link(it);
  if (l) parts.push(it.DOI ? `doi: [${l.label.replace(/^doi\.org\//, '')}](${l.url}).` : `[Online]. Available: [${l.label}](${l.url})`);
  return parts.join(' ');
}

export function applyCitations(body, lang, root, problems, style = 'ieee', R = null) {
  const lib = loadLibrary(root), used = new Map(), ieee = style !== 'apa';
  const re = /\[((?:[^\]\[]*?;\s*)?-?@[^\]]+)\]/g;
  body = body.replace(re, (all, inside) => {
    const parts = inside.split(/\s*;\s*/).map(p => p.match(/^(-?)@([^\s,]+)\s*,?\s*(.*)$/));
    if (parts.some(p => !p)) return all;                         // not a citation
    const out = [];
    for (const [, noAuthor, key, locator] of parts) {
      const it = lib.get(key);
      if (!it) { problems.push(lib.size ? `citation [@${key}] is not in content/references.json` :
        `citation [@${key}] used, but content/references.json is missing (export it from Zotero)`); return all; }
      if (!used.has(key)) used.set(key, it);
      if (ieee) {
        const n = [...used.keys()].indexOf(key) + 1;
        out.push(`[[${n}](#ref-${n})` + (locator ? ', ' + bare(locator) : '') + ']');
        continue;
      }
      const text = (noAuthor ? '' : inTextName(it) + ', ') + year(it) + (locator ? ', ' + bare(locator) : '');
      const l = link(it);
      out.push(l ? `[${text}](${l.url})` : text);
    }
    return ieee ? out.join(lang === 'ar' ? '، ' : ', ') : '(' + out.join('; ') + ')';
  });
  if (!used.size) return body;
  const heading = new RegExp(`^##\\s+(${HEADING.ar}|${HEADING.en})\\s*$`, 'm');
  const place = list => heading.test(body) ? body.replace(heading, h => h + '\n\n' + list + '\n')
    : body.replace(/\s*$/, '') + `\n\n## ${HEADING[lang] || HEADING.en}\n\n` + list + '\n';

  if (ieee) {
    /* an English list, numbered [1], [2] … in order of first citation, each with an anchor the numbers link to */
    const st = R.S('en');
    const items = [...used.values()].map((it, i) =>
      `<li id="ref-${i + 1}" style="display:flex;gap:10px;scroll-margin-top:80px;"><span style="flex:none;min-width:2.2em;">[${i + 1}]</span><span>${R.inline(ieeeReference(it), st)}</span></li>`);
    return place('```html\n    <ol dir="ltr" lang="en" style="' + st.list.replace('padding-inline-start:24px;', 'padding:0;list-style:none;') +
      'font-size:15px;text-align:left;">' + items.join('') + '</ol>\n```');
  }

  const refs = [...used.values()].sort((x, y) =>
    (family(authorsOf(x)[0] || {}) || plain(x.title)).localeCompare(family(authorsOf(y)[0] || {}) || plain(y.title), 'en') ||
    year(x).localeCompare(year(y)));
  return place(refs.map((it, i) => `${i + 1}. ${reference(it)}`).join('\n'));
}
