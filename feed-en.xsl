<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/rss/channel">
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Follow new articles | <xsl:value-of select="title"/></title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&amp;family=IBM+Plex+Sans:wght@400;600&amp;family=IBM+Plex+Mono:wght@500;600&amp;display=swap" rel="stylesheet"/>
<style>
body{margin:0;background:#F3F1EA;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#1B1F1E;}
h1,h2{font-family:'Fraunces',Georgia,serif;margin:0;}
a{color:#235E59;text-decoration:none;}
a:hover{color:#173F3B;text-decoration:underline;}
header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 24px;border-bottom:1px solid #E4E0D3;}
main{max-width:680px;margin:0 auto;padding:48px 24px;display:flex;flex-direction:column;gap:20px;}
p{margin:0;font-size:17px;line-height:1.75;color:#33342F;}
.box{background:#FBFAF5;border:1px solid #E4E0D3;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:12px;}
.url{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
code{font-family:'IBM Plex Mono',monospace;font-size:14px;background:#ECEAE1;border:1px solid #D6D2C5;border-radius:8px;padding:8px 12px;word-break:break-all;}
button{font:inherit;font-size:14px;font-weight:600;padding:8px 16px;border-radius:8px;border:1.5px solid #2F6F6A;background:#2F6F6A;color:#F9F7F0;cursor:pointer;}
ol{margin:0;padding-left:22px;font-size:16px;line-height:1.8;color:#33342F;}
.item{display:flex;flex-direction:column;gap:6px;padding:20px 24px;background:#FBFAF5;border:1px solid #E4E0D3;border-radius:14px;}
.item .t{font-size:19px;font-weight:600;color:#1B1F1E;font-family:'Fraunces',Georgia,serif;}
.item .d{font-size:15px;line-height:1.7;color:#52534C;}
</style>
</head>
<body>
<header>
  <a href="index.html" style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;">Anas Balghaith</a>
  <a href="index.html#articles" style="font-size:15px;">All articles</a>
</header>
<main>
  <h1 style="font-size:clamp(28px,4.5vw,40px);line-height:1.2;">Follow new articles</h1>
  <p>This is an RSS feed. It is not a page to read; it is an address you add to a news reader app, so every new article I publish reaches you automatically without visiting the site.</p>
  <div class="box">
    <h2 style="font-size:20px;">How to subscribe</h2>
    <ol>
      <li>Open a feed reader app, such as Feedly, Inoreader or NetNewsWire, or any RSS app you like.</li>
      <li>Copy the address below and paste it into "Add feed" or "Subscribe".</li>
    </ol>
    <div class="url">
      <code>https://anasbq.github.io/feed-en.xml</code>
      <button type="button" class="copy-btn" data-label="Copy address" data-done="Copied ✓">Copy address</button>
    </div>
    <p style="font-size:15px;color:#52534C;">Don't use RSS? You can also check the <a href="index.html#articles">article list</a> from time to time, or <a href="index.html#contact">get in touch</a>. Prefer Arabic? Use the <a href="feed.xml">Arabic feed</a>.</p>
  </div>
  <h2 style="font-size:24px;margin-top:12px;">Latest articles</h2>
  <xsl:for-each select="item">
    <a class="item">
      <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
      <span class="t"><xsl:value-of select="title"/></span>
      <span class="d"><xsl:value-of select="description"/></span>
    </a>
  </xsl:for-each>
</main>
<script>
document.querySelectorAll('.copy-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    function done() { btn.textContent = btn.getAttribute('data-done'); setTimeout(function () { btn.textContent = btn.getAttribute('data-label'); }, 2000); }
    if (navigator.clipboard) { navigator.clipboard.writeText('https://anasbq.github.io/feed-en.xml').then(done, function () {}); }
  });
});
</script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
