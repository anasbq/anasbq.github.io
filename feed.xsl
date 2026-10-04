<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/rss/channel">
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>تابع المقالات الجديدة | <xsl:value-of select="title"/></title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Arabic:wght@500;600;700&amp;family=IBM+Plex+Sans+Arabic:wght@400;500;600&amp;family=IBM+Plex+Mono:wght@500;600&amp;display=swap" rel="stylesheet"/>
<style>
body{margin:0;background:#F3F1EA;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#1B1F1E;}
h1,h2{font-family:'Noto Serif Arabic',Georgia,serif;margin:0;}
a{color:#235E59;text-decoration:none;}
a:hover{color:#173F3B;text-decoration:underline;}
header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 24px;border-bottom:1px solid #E4E0D3;}
main{max-width:680px;margin:0 auto;padding:48px 24px;display:flex;flex-direction:column;gap:20px;}
p{margin:0;font-size:17px;line-height:1.9;color:#33342F;}
.box{background:#FBFAF5;border:1px solid #E4E0D3;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:12px;}
.url{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
code{direction:ltr;font-family:'IBM Plex Mono',monospace;font-size:14px;background:#ECEAE1;border:1px solid #D6D2C5;border-radius:8px;padding:8px 12px;word-break:break-all;}
button{font:inherit;font-size:14px;font-weight:600;padding:8px 16px;border-radius:8px;border:1.5px solid #2F6F6A;background:#2F6F6A;color:#F9F7F0;cursor:pointer;}
ol{margin:0;padding-right:22px;font-size:16px;line-height:1.9;color:#33342F;}
.item{display:flex;flex-direction:column;gap:6px;padding:20px 24px;background:#FBFAF5;border:1px solid #E4E0D3;border-radius:14px;}
.item .t{font-size:19px;font-weight:600;color:#1B1F1E;font-family:'Noto Serif Arabic',Georgia,serif;}
.item .d{font-size:15px;line-height:1.8;color:#52534C;}
</style>
</head>
<body>
<header>
  <a href="ar/index.html" style="font-size:15px;font-weight:600;">أنس بلغيث</a>
  <a href="ar/index.html#articles" style="font-size:15px;">كل المقالات</a>
</header>
<main>
  <h1 style="font-size:clamp(28px,4.5vw,40px);line-height:1.35;">تابع المقالات الجديدة</h1>
  <p>هذه صفحة «خلاصة RSS». هي ليست صفحة للقراءة، بل عنوان تضعه في تطبيق قارئ الأخبار، فيصلك كل مقال جديد أنشره تلقائياً دون أن تزور الموقع.</p>
  <div class="box">
    <h2 style="font-size:20px;">كيف تشترك؟</h2>
    <ol>
      <li>افتح تطبيقاً لقراءة الخلاصات، مثل Feedly أو Inoreader أو NetNewsWire، أو أي تطبيق RSS تفضّله.</li>
      <li>انسخ العنوان التالي وألصقه في خانة «إضافة خلاصة» أو «اشتراك».</li>
    </ol>
    <div class="url">
      <code id="feed-url">https://anasbq.github.io/feed.xml</code>
      <button type="button" id="copy-btn">نسخ العنوان</button>
    </div>
    <p style="font-size:15px;color:#52534C;">لا تستخدم RSS؟ يمكنك أيضاً زيارة <a href="ar/index.html#articles">قائمة المقالات</a> من حين لآخر، أو <a href="ar/index.html#contact">مراسلتي</a>.</p>
  </div>
  <h2 style="font-size:24px;margin-top:12px;">آخر ما نشرت</h2>
  <xsl:for-each select="item">
    <a class="item">
      <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
      <span class="t"><xsl:value-of select="title"/></span>
      <span class="d"><xsl:value-of select="description"/></span>
    </a>
  </xsl:for-each>
</main>
<script>
document.getElementById('copy-btn').addEventListener('click', function () {
  var btn = this;
  var url = document.getElementById('feed-url').textContent;
  function done() { btn.textContent = 'تم النسخ ✓'; setTimeout(function () { btn.textContent = 'نسخ العنوان'; }, 2000); }
  if (navigator.clipboard) { navigator.clipboard.writeText(url).then(done, function () {}); }
});
</script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
