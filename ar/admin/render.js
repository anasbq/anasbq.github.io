/*
 * Article renderer shared by the admin page (ar/admin/new.html, in the browser) and the
 * build script (tools/build-articles.mjs, in Node / GitHub Actions). Both must produce the
 * same page for the same Markdown, so this file is the single copy of that code.
 *
 *   Browser: <script src="render.js"></script>  → window.SiteRender (uses window.katex)
 *   Node:    const R = require('../ar/admin/render.js'); R.setKatex(require('katex'));
 */
(function(root, factory){
  var R = factory();
  if(typeof module === 'object' && module.exports) module.exports = R;
  else root.SiteRender = R;
})(typeof self !== 'undefined' ? self : this, function(){
  var SITE = 'https://anasbq.github.io';
  var MONTHS = {
    ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    en:['January','February','March','April','May','June','July','August','September','October','November','December']
  };
  var KATEX_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';

  var katexLib = null;
  function setKatex(k){ katexLib = k; }
  function katex(){ return katexLib || (typeof window !== 'undefined' ? window.katex : null); }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function xml(s){ return esc(s).replace(/'/g,'&apos;'); }
  function reEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  /* ---------- styles that match the existing articles ---------- */
  function S(lang){
    var lh = lang==='ar' ? '1.9' : '1.75';
    return {
      rtl: lang==='ar',
      p:   'margin:0;font-size:17px;line-height:'+lh+';color:#33342F;',
      h2:  'margin:16px 0 0;font-size:clamp(22px,3vw,28px);line-height:1.4;color:#1B1F1E;',
      h3:  'margin:8px 0 0;font-size:20px;line-height:1.5;color:#1B1F1E;',
      list:'margin:0;padding-inline-start:24px;font-size:17px;line-height:'+lh+';color:#33342F;display:flex;flex-direction:column;gap:6px;',
      quote:'margin:0;padding:14px 20px;border-inline-start:3px solid #2F6F6A;background:#FBFAF5;border-radius:6px;font-size:17px;line-height:'+lh+';color:#33342F;',
      fig: 'margin:8px 0;display:flex;flex-direction:column;gap:8px;',
      img: 'width:100%;height:auto;border-radius:10px;border:1px solid #E4E0D3;',
      cap: 'font-size:14px;line-height:1.7;color:#7A7B70;text-align:center;',
      code:"font-family:'IBM Plex Mono',monospace;font-size:0.92em;background:#EFECE2;padding:1px 5px;border-radius:4px;",
      lead:'margin:0;font-size:19px;line-height:1.8;color:#52534C;'
    };
  }

  /* ---------- equations and chemistry (KaTeX + mhchem) ---------- */
  var state = { mathError: null };
  function mathHtml(tex, display){
    var k = katex();
    if(!k) return '<code dir="ltr">'+esc(tex)+'</code>';
    var html;
    try{
      html = k.renderToString(tex, { displayMode: display, throwOnError: true });
    }catch(e){
      state.mathError = state.mathError || tex;
      html = '<code dir="ltr" style="color:#B5651D;">'+esc(tex)+'</code>';
    }
    return display
      ? '<div dir="ltr" style="margin:4px 0;overflow-x:auto;overflow-y:hidden;text-align:center;font-size:1.1em;">'+html+'</div>'
      : '<span dir="ltr">'+html+'</span>';
  }
  function hasMath(src){ return /\$[^$\n]+\$/.test(src); }

  /* ---------- a small Markdown converter ---------- */
  function inline(t, st){
    var keep = [];
    t = t.replace(/\$([^$\n]+?)\$/g, function(_,tex){ keep.push(mathHtml(tex,false)); return '\u0000'+(keep.length-1)+'\u0000'; });
    t = esc(t);
    t = t.replace(/`([^`]+)`/g, function(_,c){ return '<code style="'+st.code+'">'+c+'</code>'; });
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s)]+\.html[^\s)]*)\)/g,
      function(_,txt,url){
        var ext = /^https?:/.test(url) && url.indexOf(SITE)!==0;
        return '<a href="'+url+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+txt+'</a>';
      });
    t = t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>');
    t = t.replace(/~([^~\s][^~]*?)~/g,'<sub>$1</sub>');
    t = t.replace(/\^([^\^\s][^\^]*?)\^/g,'<sup>$1</sup>');
    /* in Arabic text, keep an English citation like (Farias et al., 2013) in reading order and on one line */
    if(st.rtl) t = t.replace(/\(((?:<a [^>]*>)?[A-Za-z][^()<>\u0600-\u06ff]*?\b(?:1[89]|20)\d\d[a-z]?(?:<\/a>)?)\)/g,
      '(<bdi style="white-space:nowrap">$1</bdi>)');
    t = t.replace(/\u0000(\d+)\u0000/g, function(_,i){ return keep[+i]; });
    return t;
  }

  /*
   * Besides the usual blocks, a fenced ```html … ``` block is copied into the page as it is.
   * It holds the hand-made parts of older articles (interactive figures, their styles and
   * scripts). Everything else is escaped.
   */
  function md(src, lang){
    var st = S(lang), out = [], ind = '    ', raws = [];
    src = String(src||'').replace(/\r/g,'').replace(/^```html[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm, function(_,h){
      raws.push(h); return '\n\n\u0001'+(raws.length-1)+'\u0001\n\n';
    });
    var blocks = src.split(/\n\s*\n/);
    blocks.forEach(function(b){
      b = b.replace(/^\s+|\s+$/g,'');
      if(!b) return;
      var lines = b.split('\n'), m;
      if((m = b.match(/^\u0001(\d+)\u0001$/))){
        out.push(raws[+m[1]]);
      } else if((m = b.match(/^\$\$([\s\S]+)\$\$$/))){
        out.push(ind+mathHtml(m[1].trim(), true));
      } else if((m = b.match(/^(#{2,3})\s+(.+)$/)) && lines.length===1){
        var tag = m[1].length===2 ? 'h2' : 'h3';
        out.push(ind+'<'+tag+' style="'+st[tag]+'">'+inline(m[2],st)+'</'+tag+'>');
      } else if((m = b.match(/^!\[([^\]]*)\]\((\S+)\)$/))){
        out.push(ind+'<figure style="'+st.fig+'"><img src="'+esc(m[2])+'" alt="'+esc(m[1])+'" loading="lazy" style="'+st.img+'">'+
          (m[1]?'<figcaption style="'+st.cap+'">'+esc(m[1])+'</figcaption>':'')+'</figure>');
      } else if(lines.every(function(l){ return /^\s*[-*]\s+/.test(l); })){
        out.push(ind+'<ul style="'+st.list+'">'+lines.map(function(l){
          return '<li>'+inline(l.replace(/^\s*[-*]\s+/,''),st)+'</li>'; }).join('')+'</ul>');
      } else if(lines.every(function(l){ return /^\s*\d+[.)]\s+/.test(l); })){
        out.push(ind+'<ol style="'+st.list+'">'+lines.map(function(l){
          return '<li>'+inline(l.replace(/^\s*\d+[.)]\s+/,''),st)+'</li>'; }).join('')+'</ol>');
      } else if(lines.every(function(l){ return /^>\s?/.test(l); })){
        out.push(ind+'<blockquote style="'+st.quote+'">'+inline(lines.map(function(l){
          return l.replace(/^>\s?/,''); }).join(' '),st)+'</blockquote>');
      } else {
        out.push(ind+'<p style="'+st.p+'">'+lines.map(function(l){ return inline(l,st); }).join('<br>')+'</p>');
      }
    });
    return out.join('\n\n');
  }

  /* ---------- the article page itself ---------- */
  function monthLabel(lang, d){ return MONTHS[lang][d.getMonth()]+' '+d.getFullYear(); }

  function articlePath(a){ return (a.lang==='ar' ? 'articles/' : 'en/articles/') + a.slug + '.html'; }

  function articleHtml(a){
    var ar = a.lang==='ar', up = ar ? '../' : '../../', url = SITE+'/'+articlePath(a);
    var home = ar ? up+'ar/index.html' : up+'index.html';
    var st = S(a.lang), month = monthLabel(a.lang, a.dateObj);
    var feed = ar ? SITE+'/feed.xml' : SITE+'/feed-en.xml';
    var name = ar ? 'أنس بلغيث' : 'Anas Balghaith';
    var fonts = ar
      ? 'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&family=Noto+Serif+Arabic:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600'
      : 'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600';
    return [
'<!doctype html>',
'<html lang="'+a.lang+'"'+(ar?' dir="rtl"':'')+'>',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>'+esc(a.title)+' | '+name+'</title>',
'<meta name="description" content="'+esc(a.summary)+'">',
'<meta name="author" content="'+name+'">',
'<link rel="canonical" href="'+url+'">',
'<link rel="alternate" type="application/rss+xml" title="'+(ar?'مقالات أنس بلغيث':'Anas Balghaith — Articles')+'" href="'+feed+'">',
'<meta property="og:type" content="article">',
'<meta property="og:locale" content="'+(ar?'ar_AR':'en_US')+'">',
'<meta property="og:title" content="'+esc(a.title)+'">',
'<meta property="og:description" content="'+esc(a.summary)+'">',
'<meta property="og:url" content="'+url+'">',
'<meta property="og:image" content="'+SITE+'/images/me.jpg">',
'<link href="https://fonts.googleapis.com/css2?'+fonts+'&display=swap" rel="stylesheet">',
hasMath(a.body) ? '<link rel="stylesheet" href="'+KATEX_CSS+'">' : '',
'<style>',
"body{margin:0;background:#F3F1EA;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#1B1F1E;}",
"h1,h2,h3{font-family:'Fraunces',Georgia,serif;}",
'a{color:#235E59;text-decoration:none;}',
'a:hover{color:#173F3B;text-decoration:underline;}',
'::selection{background:#2F6F6A;color:#F9F7F0;}',
ar ? ".ar{font-family:'IBM Plex Sans Arabic','IBM Plex Sans',system-ui,sans-serif;}\n.ar h1,.ar h2,.ar h3{font-family:'Noto Serif Arabic','Fraunces',serif;}" : '',
'</style>',
'</head>',
'<body>',
'<div style="width: 100%; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; background: #F3F1EA;">',
'',
ar
? '<header dir="rtl" lang="ar" class="ar" style="position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 24px;background:#F3F1EA;border-bottom:1px solid #E4E0D3;">\n'+
  '  <a href="'+home+'" style="font-size:15px;font-weight:600;">أنس بلغيث</a>\n'+
  '  <nav style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;font-size:15px;">\n'+
  '    <a href="'+home+'#articles" style="padding:8px 12px;">كل المقالات</a>\n'+
  '    <a href="'+home+'#about" style="padding:8px 12px;">من أنا</a>\n'+
  '    <a href="'+home+'#contact" style="padding:8px 12px;">تواصل معي</a>\n'+
  '  </nav>\n</header>'
: '<header style="position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 24px;background:#F3F1EA;border-bottom:1px solid #E4E0D3;">\n'+
  '  <a href="'+home+'" style="font-family:\'IBM Plex Mono\',monospace;font-size:15px;font-weight:600;">Anas Balghaith</a>\n'+
  '  <nav style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;font-size:15px;">\n'+
  '    <a href="'+home+'#articles" style="padding:8px 12px;">All articles</a>\n'+
  '    <a href="'+home+'#about" style="padding:8px 12px;">About</a>\n'+
  '    <a href="'+home+'#contact" style="padding:8px 12px;">Contact</a>\n'+
  '  </nav>\n</header>',
'',
'<article'+(ar?' class="ar" dir="rtl" lang="ar"':'')+' style="padding: clamp(48px,8vw,96px) 24px; display: flex; justify-content: center;">',
'  <div style="max-width: 680px; width: 100%; display: flex; flex-direction: column; gap: 20px;'+(ar?' text-align: right;':'')+'">',
'    <div style="font-family: \'IBM Plex Mono\', monospace; font-size: 13px; letter-spacing: 0.02em; color: #2F6F6A;">'+month+'</div>',
'    <h1 style="margin: 0; font-size: clamp(28px,4.5vw,42px); line-height: '+(ar?'1.35':'1.2')+'; color: #1B1F1E;">'+esc(a.title)+'</h1>',
'    <p style="'+st.lead+'">'+esc(a.summary)+'</p>',
'',
md(a.body, a.lang),
'  </div>',
'</article>',
'',
'<footer style="padding: 32px 24px; display: flex; justify-content: center;">',
ar ? '  <a href="'+home+'#articles" class="ar" dir="rtl" style="font-size: 14px; font-weight: 600;">→ العودة إلى كل المقالات</a>'
   : '  <a href="'+home+'#articles" style="font-size: 14px; font-weight: 600;">← Back to all articles</a>',
'</footer>',
'',
'</div>',
'<script data-goatcounter="https://anasbq.goatcounter.com/count" async src="//gc.zgo.at/count.js"><\/script>',
'</body>',
'</html>',
''
    ].filter(function(l){ return l!==''; }).join('\n').replace(/\n(<header|<article|<footer|<\/div>\n<script)/g,'\n\n$1');
  }

  /* ---------- the home-page card and the RSS item ---------- */
  function cardHtml(a){
    var ar = a.lang==='ar', href = ar ? '../'+articlePath(a) : articlePath(a);
    return '    <a href="'+href+'" style="display: flex; flex-direction: column; gap: 6px; padding: 24px; background: #FBFAF5; border: 1px solid #E4E0D3; border-radius: 14px;">\n'+
      (ar ? '      <div style="font-size: 13px; color: #2F6F6A; font-weight: 600;">'+monthLabel('ar',a.dateObj)+'</div>\n'+
            '      <div style="font-size: 19px; font-weight: 600; color: #1B1F1E; font-family: \'Noto Serif Arabic\', Georgia, serif;">'+esc(a.title)+'</div>\n'+
            '      <div style="font-size: 15px; line-height: 1.8; color: #52534C;">'+esc(a.summary)+'</div>\n'
          : '      <div style="font-family: \'IBM Plex Mono\', monospace; font-size: 13px; color: #2F6F6A;">'+monthLabel('en',a.dateObj)+'</div>\n'+
            '      <div style="font-size: 19px; font-weight: 600; color: #1B1F1E; font-family: \'Fraunces\', Georgia, serif;">'+esc(a.title)+'</div>\n'+
            '      <div style="font-size: 15px; line-height: 1.6; color: #52534C;">'+esc(a.summary)+'</div>\n')+
      '    </a>\n';
  }

  function touchUpdated(html, lang){
    var label = monthLabel(lang, new Date());
    return lang==='ar' ? html.replace(/آخر تحديث: [^.<]+\./, 'آخر تحديث: '+label+'.')
                       : html.replace(/Last updated [A-Za-z]+ \d{4}\./, 'Last updated '+label+'.');
  }

  function addCard(html, a){
    var ar = a.lang==='ar';
    var sec = html.indexOf('id="articles"');
    if(sec<0) throw new Error('لم أجد قسم المقالات في الصفحة الرئيسية.');
    var marker = ar ? '    <a href="../articles/' : '    <a href="en/articles/';
    var at = html.indexOf(marker, sec);
    if(at<0){
      at = html.indexOf(ar ? '    <p style="margin: 0; font-size: 15px; line-height: 1.9; color: #7A7B70;">تابع' :
                             '    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #7A7B70;">Follow', sec);
    }
    if(at<0) throw new Error('لم أجد مكان إضافة البطاقة في الصفحة الرئيسية.');
    html = html.slice(0,at) + cardHtml(a) + html.slice(at);
    return touchUpdated(html, a.lang);
  }

  /* the card already on the home page for this article, if any */
  function cardRe(a){
    var href = a.lang==='ar' ? '../'+articlePath(a) : articlePath(a);
    return new RegExp('[ \\t]*<a href="'+reEsc(href).replace(/ /g,'(?: |%20)')+'"[^>]*>[\\s\\S]*?</a>[ \\t]*\\n?');
  }
  /* replace the card in place when the article is already listed, otherwise add it on top */
  function upsertCard(html, a){
    var re = cardRe(a);
    if(re.test(html)) return touchUpdated(html.replace(re, function(){ return cardHtml(a); }), a.lang);
    return addCard(html, a);
  }

  function feedItem(a){
    var url = SITE+'/'+articlePath(a);
    return '  <item>\n'+
      '    <title>'+xml(a.title)+'</title>\n'+
      '    <link>'+url+'</link>\n'+
      '    <guid>'+url+'</guid>\n'+
      '    <pubDate>'+a.dateObj.toUTCString()+'</pubDate>\n'+
      '    <description>'+xml(a.summary)+'</description>\n'+
      '  </item>\n';
  }
  function stampFeed(xmlText){
    return xmlText.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/, '<lastBuildDate>'+new Date().toUTCString()+'</lastBuildDate>');
  }
  function addFeedItem(xmlText, a){
    var at = xmlText.indexOf('  <item>');
    if(at<0) at = xmlText.indexOf('</channel>');
    if(at<0) throw new Error('ملف RSS غير متوقع الشكل.');
    return stampFeed(xmlText.slice(0,at) + feedItem(a) + xmlText.slice(at));
  }
  function upsertFeedItem(xmlText, a){
    var url = SITE+'/'+articlePath(a);
    var re = new RegExp('[ \\t]*<item>(?:(?!</item>)[\\s\\S])*?<link>'+reEsc(url).replace(/ /g,'(?: |%20)')+'</link>[\\s\\S]*?</item>[ \\t]*\\n?');
    if(re.test(xmlText)) return stampFeed(xmlText.replace(re, function(){ return feedItem(a); }));
    return addFeedItem(xmlText, a);
  }

  /* ---------- the Markdown source kept in content/articles/ ---------- */
  function yamlStr(s){ return '"'+String(s==null?'':s).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'; }
  function sourcePath(a){ return 'content/articles/'+(a.lang==='en' ? 'en/' : '')+a.slug+'.md'; }
  function sourceMd(a){
    return '---\n'+
      'title: '+yamlStr(a.title)+'\n'+
      'summary: '+yamlStr(a.summary)+'\n'+
      'lang: '+a.lang+'\n'+
      'date: '+a.date+'\n'+
      'slug: '+a.slug+'\n'+
      'status: '+(a.status || 'published')+'\n'+
      '---\n\n'+String(a.body||'').replace(/\s+$/,'')+'\n';
  }

  return {
    SITE:SITE, MONTHS:MONTHS, KATEX_CSS:KATEX_CSS, state:state, setKatex:setKatex,
    esc:esc, xml:xml, S:S, mathHtml:mathHtml, hasMath:hasMath, inline:inline, md:md,
    monthLabel:monthLabel, articlePath:articlePath, articleHtml:articleHtml,
    cardHtml:cardHtml, addCard:addCard, upsertCard:upsertCard,
    addFeedItem:addFeedItem, upsertFeedItem:upsertFeedItem,
    sourcePath:sourcePath, sourceMd:sourceMd
  };
});
