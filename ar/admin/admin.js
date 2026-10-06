/* Shared code for the site admin (ar/admin/*): layout, storage, GitHub API. */
(function(){
  var REPO = 'anasbq/anasbq.github.io', BRANCH = 'main', SITE = 'https://anasbq.github.io';
  var KEYS = { gh:'gh_publish_token', gcSite:'gc_site', gcToken:'gc_token' };

  /* ---------- storage: every access guarded (private windows can throw) ---------- */
  var plain = {
    get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
    del: function(k){ try{ localStorage.removeItem(k); }catch(e){} }
  };

  /*
   * Passcode lock. With a passcode set, the secret keys are kept only AES-GCM encrypted
   * in localStorage (VAULT, key from PBKDF2 over the passcode). Unlocking puts the AES key
   * and the secrets in sessionStorage, which the browser drops when the tab closes;
   * IDLE_MS without activity locks again.
   */
  var SECRETS = [KEYS.gh, KEYS.gcToken], VAULT = 'admin_vault', SESSION = 'admin_session', IDLE_MS = 30*60*1000;
  var ss = {
    get: function(){ try{ return JSON.parse(sessionStorage.getItem(SESSION) || 'null'); }catch(e){ return null; } },
    set: function(v){ try{ sessionStorage.setItem(SESSION, JSON.stringify(v)); }catch(e){} },
    del: function(){ try{ sessionStorage.removeItem(SESSION); }catch(e){} }
  };
  function isSecret(k){ return SECRETS.indexOf(k) > -1; }
  function vault(){ try{ return JSON.parse(plain.get(VAULT) || 'null'); }catch(e){ return null; } }
  function session(){
    var s = ss.get();
    if(s && Date.now() - s.t > IDLE_MS){ ss.del(); return null; }
    return s;
  }

  var b64 = function(buf){ return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); };
  var unb64 = function(str){ return Uint8Array.from(atob(str), function(c){ return c.charCodeAt(0); }); };
  function deriveKey(pass, salt){
    var te = new TextEncoder();
    return crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function(base){
      return crypto.subtle.deriveKey({ name:'PBKDF2', salt:salt, iterations:310000, hash:'SHA-256' }, base,
        { name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
    });
  }
  function seal(key, salt, secrets){
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, key, new TextEncoder().encode(JSON.stringify(secrets)))
      .then(function(ct){ plain.set(VAULT, JSON.stringify({ v:1, salt:b64(salt), iv:b64(iv), data:b64(ct) })); });
  }
  function rawKey(s){ return crypto.subtle.importKey('raw', unb64(s.k), 'AES-GCM', true, ['encrypt','decrypt']); }
  function startSession(key, secrets){
    return crypto.subtle.exportKey('raw', key).then(function(r){ ss.set({ k:b64(r), s:secrets, t:Date.now() }); });
  }
  /* re-encrypt after a secret changes while unlocked */
  function reseal(s){ return rawKey(s).then(function(key){ return seal(key, unb64(vault().salt), s.s); }); }

  var ls = {
    get: function(k){
      if(!isSecret(k) || !vault()) return plain.get(k);
      var s = session(); return s && s.s[k] != null ? s.s[k] : null;
    },
    set: function(k,v){
      if(!isSecret(k) || !vault()) return plain.set(k,v);
      var s = session(); if(!s) return;
      s.s[k] = v; ss.set(s); reseal(s);
    },
    del: function(k){
      if(!isSecret(k) || !vault()) return plain.del(k);
      var s = session(); if(!s) return;
      delete s.s[k]; ss.set(s); reseal(s);
    }
  };

  var lock = {
    enabled: function(){ return !!vault(); },
    unlocked: function(){ return !!session(); },
    /* turn the lock on: encrypt the saved keys and remove the readable copies */
    enable: function(pass){
      var salt = crypto.getRandomValues(new Uint8Array(16)), secrets = {};
      SECRETS.forEach(function(k){ var v = plain.get(k); if(v != null) secrets[k] = v; });
      return deriveKey(pass, salt).then(function(key){
        return seal(key, salt, secrets).then(function(){ return startSession(key, secrets); });
      }).then(function(){ SECRETS.forEach(plain.del); });
    },
    unlock: function(pass){
      var v = vault();
      return deriveKey(pass, unb64(v.salt)).then(function(key){
        return crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(v.iv) }, key, unb64(v.data)).then(function(pt){
          return startSession(key, JSON.parse(new TextDecoder().decode(pt)));
        });
      }).catch(function(){ throw new Error('الرمز غير صحيح.'); });
    },
    change: function(pass){
      var s = session(); if(!s) return Promise.reject(new Error('افتح القفل أولاً.'));
      var salt = crypto.getRandomValues(new Uint8Array(16));
      return deriveKey(pass, salt).then(function(key){
        return seal(key, salt, s.s).then(function(){ return startSession(key, s.s); });
      });
    },
    /* turn the lock off: keys go back to plain localStorage */
    disable: function(){
      var s = session(); if(!s) return false;
      Object.keys(s.s).forEach(function(k){ plain.set(k, s.s[k]); });
      plain.del(VAULT); ss.del(); return true;
    },
    /* forgot the passcode: drop the encrypted keys; they must be entered again */
    reset: function(){ plain.del(VAULT); ss.del(); },
    lock: function(){ ss.del(); location.reload(); }
  };

  function lockScreen(){
    var o = document.createElement('div');
    o.className = 'adm-lock';
    o.innerHTML = '<form class="card" autocomplete="off"><h1>لوحة التحكم مقفلة</h1>'+
      '<p class="muted">أدخل الرمز السري لفتحها.</p>'+
      '<label for="admPass">الرمز السري</label><input id="admPass" type="password" autocomplete="current-password" required>'+
      '<div class="msg err" id="admPassMsg" role="alert"></div>'+
      '<div class="row" style="margin-top:14px;justify-content:space-between;"><button class="btn" type="submit">فتح</button>'+
      '<button class="btn ghost sm" type="button" id="admForgot">نسيت الرمز</button></div></form>';
    document.body.appendChild(o);
    document.documentElement.classList.add('adm-locked');
    var input = o.querySelector('input'), msgEl = o.querySelector('#admPassMsg'), btn = o.querySelector('[type=submit]');
    input.focus();
    o.querySelector('form').addEventListener('submit', function(e){
      e.preventDefault(); btn.disabled = true; msgEl.textContent = '';
      lock.unlock(input.value).then(function(){ location.reload(); }).catch(function(err){
        setTimeout(function(){ btn.disabled = false; msgEl.textContent = err.message; input.select(); }, 600);
      });
    });
    o.querySelector('#admForgot').addEventListener('click', function(){
      if(!confirm('لا يمكن استرجاع الرمز. سيُمسح المفتاحان المحفوظان من هذا المتصفح وتدخلهما من جديد في الإعدادات (مفتاح GitHub ومفتاح GoatCounter).\n\nمتابعة؟')) return;
      lock.reset(); location.href = 'settings.html';
    });
  }

  /* gate every admin page; keep the session alive while the page is used */
  if(vault()){
    if(!session()) lockScreen();
    else {
      var bump = function(){ var s = ss.get(); if(s && Date.now() - s.t > 15000){ s.t = Date.now(); ss.set(s); } };
      ['click','keydown','scroll','touchstart'].forEach(function(ev){ addEventListener(ev, bump, { passive:true }); });
      setInterval(function(){ if(!session()) location.reload(); }, 30000);
    }
  }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function xml(s){ return esc(s).replace(/'/g,'&apos;'); }
  function $(id){ return document.getElementById(id); }

  /* ---------- layout ---------- */
  var ICONS = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    stats:'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    articles:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h7"/>',
    plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    pages:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h8"/>',
    media:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    out:'<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v6H4V6h6"/>'
  };
  var NAV = [
    { grp:'نظرة عامة' },
    { id:'stats',    href:'index.html',    label:'لوحة التحكم',     icon:'stats' },
    { grp:'المحتوى' },
    { id:'articles', href:'articles.html', label:'المقالات',        icon:'articles' },
    { id:'new',      href:'new.html',      label:'مقالة جديدة',     icon:'plus' },
    { id:'pages',    href:'pages.html',    label:'تعديل الصفحات',   icon:'pages' },
    { id:'media',    href:'media.html',    label:'الصور',           icon:'media' },
    { grp:'الحساب' },
    { id:'settings', href:'settings.html', label:'الإعدادات',       icon:'settings' }
  ];
  function icon(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>'; }

  function layout(active){
    var top = document.createElement('header');
    top.className = 'adm-top';
    top.innerHTML = '<span class="adm-brand">أنس بلغيث<small>لوحة التحكم</small></span>'+
      '<a class="adm-site" href="../index.html" target="_blank" rel="noopener">عرض الموقع ↗</a>';
    var side = document.createElement('nav');
    side.className = 'adm-side';
    side.setAttribute('aria-label','أقسام لوحة التحكم');
    side.innerHTML = NAV.map(function(n){
      if(n.grp) return '<div class="grp">'+n.grp+'</div>';
      return '<a href="'+n.href+'"'+(n.id===active?' class="on" aria-current="page"':'')+'>'+icon(n.icon)+n.label+'</a>';
    }).join('');
    if(lock.enabled() && lock.unlocked()){
      var b = document.createElement('button');
      b.className = 'btn ghost sm'; b.type = 'button'; b.textContent = 'قفل';
      b.addEventListener('click', lock.lock);
      var right = document.createElement('span'); right.className = 'row';
      right.appendChild(top.querySelector('.adm-site')); right.appendChild(b);
      top.appendChild(right);
    }
    var main = document.querySelector('main');
    main.classList.add('adm-main');
    var shell = document.createElement('div');
    shell.className = 'adm-shell';
    main.parentNode.insertBefore(shell, main);
    shell.appendChild(side); shell.appendChild(main);
    document.body.insertBefore(top, shell);
  }

  function toast(msg, kind, html){
    var t = document.createElement('div');
    t.className = 'adm-toast'+(kind==='err'?' err':'');
    t.setAttribute('role','status');
    if(html) t.innerHTML = msg; else t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, kind==='err' ? 7000 : 4000);
  }

  /* shows a notice and returns false when no GitHub token is saved yet */
  function needToken(where){
    if(ls.get(KEYS.gh)) return true;
    var n = document.createElement('div');
    n.className = 'notice';
    n.innerHTML = 'لكي تحفظ أي تعديل على الموقع تحتاج مفتاح GitHub. أضفه مرة واحدة من <a href="settings.html">الإعدادات</a>.';
    (where || document.querySelector('.adm-main .wrap')).prepend(n);
    return false;
  }

  /* ---------- GitHub ---------- */
  function gh(path, opts){
    opts = opts || {};
    var headers = { 'X-GitHub-Api-Version':'2022-11-28',
      'Accept': opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
    if(ls.get(KEYS.gh)) headers['Authorization'] = 'Bearer '+ls.get(KEYS.gh);
    if(opts.body) headers['Content-Type'] = 'application/json';
    var url = /^https:/.test(path) ? path : 'https://api.github.com/repos/'+REPO+path;
    return fetch(url, {
      method: opts.method || 'GET', headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined, cache:'no-store'
    }).then(function(r){
      if(opts.allow404 && r.status===404) return null;
      if(r.status===401) throw new Error('مفتاح GitHub غير صالح أو منتهي. حدّثه من الإعدادات.');
      if(r.status===403 || r.status===404) throw new Error('مفتاح GitHub لا يملك صلاحية الكتابة على المستودع (Contents: Read and write).');
      if(r.status===422 && opts.method==='PATCH'){ var e = new Error('race'); e.race = true; throw e; }
      if(!r.ok) throw new Error('رفض GitHub الطلب (رمز '+r.status+').');
      return opts.raw ? r.text() : r.json();
    });
  }
  function enc(p){ return p.split('/').map(encodeURIComponent).join('/'); }

  function head(){
    return gh('/git/ref/heads/'+BRANCH).then(function(ref){
      var sha = ref.object.sha;
      return gh('/git/commits/'+sha).then(function(c){ return { sha: sha, tree: c.tree.sha }; });
    });
  }
  function raw(path, ref){ return gh('/contents/'+enc(path)+'?ref='+ref, { raw:true, allow404:true }); }
  function exists(path, ref){ return gh('/contents/'+enc(path)+'?ref='+ref, { allow404:true }).then(function(x){ return !!x; }); }
  function tree(ref){ return gh('/git/trees/'+ref+'?recursive=1').then(function(t){ return t.tree; }); }

  /*
   * One commit on main. build(h) receives the current head and returns (a promise of)
   * a list of changes: {path, content} for text, {path, base64} for binary, {path, remove:true}.
   * If main moved meanwhile, build runs again on the new head once.
   */
  function commit(build, message){
    function once(){
      var h;
      return head().then(function(x){ h = x; return build(h); }).then(function(changes){
        return Promise.all(changes.map(function(c){
          if(c.remove) return { path:c.path, mode:'100644', type:'blob', sha:null };
          if(c.base64!=null) return gh('/git/blobs', { method:'POST', body:{ content:c.base64, encoding:'base64' } })
            .then(function(b){ return { path:c.path, mode:'100644', type:'blob', sha:b.sha }; });
          return { path:c.path, mode:'100644', type:'blob', content:c.content };
        }));
      }).then(function(entries){
        return gh('/git/trees', { method:'POST', body:{ base_tree:h.tree, tree:entries } });
      }).then(function(t){
        return gh('/git/commits', { method:'POST', body:{ message: message + '\n\nMade in the site admin (ar/admin)', tree:t.sha, parents:[h.sha] } });
      }).then(function(c){
        return gh('/git/refs/heads/'+BRANCH, { method:'PATCH', body:{ sha:c.sha } }).then(function(){ return c.sha; });
      });
    }
    return once().catch(function(e){ if(e.race) return once(); throw e; });
  }

  /* ---------- site content helpers ---------- */
  var MONTHS = {
    ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    en:['January','February','March','April','May','June','July','August','September','October','November','December']
  };
  function homeOf(lang){ return lang==='ar' ? 'ar/index.html' : 'index.html'; }
  function feedOf(lang){ return lang==='ar' ? 'feed.xml' : 'feed-en.xml'; }
  function langOf(path){ return /^en\//.test(path) ? 'en' : 'ar'; }
  /* the href a home page uses for an article */
  function cardHref(path){ return langOf(path)==='ar' ? '../'+path : path; }
  function reEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  function removeCard(html, path){
    var re = new RegExp('[ \\t]*<a href="'+reEsc(cardHref(path)).replace(/ /g,'(?: |%20)')+'"[^>]*>[\\s\\S]*?</a>[ \\t]*\\n?');
    return html.replace(re, '');
  }
  function removeFeedItem(xmlText, path){
    var url = SITE+'/'+path;
    return xmlText.replace(new RegExp('[ \\t]*<item>(?:(?!</item>)[\\s\\S])*?<link>'+reEsc(url).replace(/ /g,'(?: |%20)')+'</link>[\\s\\S]*?</item>[ \\t]*\\n?'), '');
  }

  /* files under images/ get a relative path from the page that uses them */
  function relFrom(pagePath, target){
    var depth = pagePath.split('/').length - 1;
    return new Array(depth+1).join('../') + target;
  }

  /* read a File as base64, shrinking big photos to at most 1600px wide */
  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onerror = function(){ reject(new Error('تعذّرت قراءة الملف.')); };
      fr.onload = function(){
        var dataUrl = fr.result;
        if(!/^image\/(jpeg|png|webp)$/.test(file.type)){ resolve({ base64:dataUrl.split(',')[1], type:file.type }); return; }
        var img = new Image();
        img.onload = function(){
          if(img.naturalWidth <= 1600){ resolve({ base64:dataUrl.split(',')[1], type:file.type }); return; }
          var w = 1600, h = Math.round(img.naturalHeight * 1600 / img.naturalWidth);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          var out = c.toDataURL('image/jpeg', 0.86);
          resolve({ base64: out.split(',')[1], type:'image/jpeg' });
        };
        img.onerror = function(){ resolve({ base64:dataUrl.split(',')[1], type:file.type }); };
        img.src = dataUrl;
      };
      fr.readAsDataURL(file);
    });
  }
  function imageName(file, type){
    var base = (file.name || 'image').replace(/\.[^.]+$/,'').toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'image';
    var ext = type==='image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase();
    var d = new Date();
    return 'images/'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+
      Math.random().toString(36).slice(2,6)+'-'+base+'.'+ext;
  }

  window.Admin = {
    REPO:REPO, BRANCH:BRANCH, SITE:SITE, KEYS:KEYS, MONTHS:MONTHS,
    ls:ls, lock:lock, esc:esc, xml:xml, $:$, layout:layout, toast:toast, needToken:needToken,
    gh:gh, head:head, raw:raw, exists:exists, tree:tree, commit:commit, enc:enc,
    homeOf:homeOf, feedOf:feedOf, langOf:langOf, cardHref:cardHref,
    removeCard:removeCard, removeFeedItem:removeFeedItem, relFrom:relFrom,
    fileToBase64:fileToBase64, imageName:imageName
  };
})();
