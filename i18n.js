/* Self-Hosted 13-Language i18n Engine for Mithun Mutsuddi, CA(cc)
   100% CSP-compliant ('self'), zero innerHTML, on-demand JSON dictionary loading (~6 KB core),
   bot-safe browser language auto-detection, ?lang= URL support, and full Arabic RTL support. */
(function(){
  "use strict";
  var VALID = ["en-US","en-GB","bn","ar","zh-CN","zh-TW","ja","de","fr","es","pt","ru","it"];
  var BADGES = {
    "en-US":"US","en-GB":"UK","bn":"বাংলা","ar":"AR",
    "zh-CN":"简","zh-TW":"繁","ja":"JP","de":"DE",
    "fr":"FR","es":"ES","pt":"PT","ru":"RU","it":"IT"
  };
  var COUNTS = {
    "en-US":"Showing {0} of {1} engagements",
    "en-GB":"Showing {0} of {1} engagements",
    "bn":"{1}টি এনগেজমেন্টের মধ্যে {0}টি দেখানো হচ্ছে",
    "ar":"عرض {0} من أصل {1} مهمة تدقيق",
    "zh-CN":"显示 {0} / {1} 个审计项目",
    "zh-TW":"顯示 {0} / {1} 個稽核專案",
    "ja":"全{1}件中 {0}件の監査案件を表示",
    "de":"{0} von {1} Mandaten werden angezeigt",
    "fr":"Affichage de {0} sur {1} missions",
    "es":"Mostrando {0} de {1} encargos",
    "pt":"Exibindo {0} de {1} trabalhos",
    "ru":"Показано проектов: {0} из {1}",
    "it":"Visualizzati {0} di {1} incarichi"
  };
  var CACHE = {};

  function norm(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function isCrawler(){
    var ua = (navigator.userAgent || "");
    return /Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Applebot|facebot|LinkedInBot/i.test(ua);
  }

  function matchBrowserLang(){
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en-US"];
    for(var i = 0; i < list.length; i++){
      var raw = String(list[i] || "").trim();
      if(!raw) continue;
      var low = raw.toLowerCase();
      if(low.indexOf("bn") === 0) return "bn";
      if(low === "en-gb" || low === "en-au" || low === "en-nz" || low === "en-ie" || low === "en-za" || low === "en-in") return "en-GB";
      if(low.indexOf("en") === 0) return "en-US";
      if(low.indexOf("ar") === 0) return "ar";
      if(low === "zh-tw" || low === "zh-hk" || low === "zh-mo" || low.indexOf("zh-hant") === 0) return "zh-TW";
      if(low.indexOf("zh") === 0) return "zh-CN";
      if(low.indexOf("ja") === 0) return "ja";
      if(low.indexOf("de") === 0) return "de";
      if(low.indexOf("fr") === 0) return "fr";
      if(low.indexOf("es") === 0) return "es";
      if(low.indexOf("pt") === 0) return "pt";
      if(low.indexOf("ru") === 0) return "ru";
      if(low.indexOf("it") === 0) return "it";
    }
    return "en-US";
  }

  function getQueryLang(){
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if(!q) return null;
      for(var i = 0; i < VALID.length; i++){
        if(VALID[i].toLowerCase() === q.toLowerCase()) return VALID[i];
      }
    } catch(e){}
    return null;
  }

  var currentLang = "en-US";
  var origTitle = document.title;

  function getBasePrefix(){
    var b = document.documentElement.getAttribute("data-i18n-base");
    return b ? b : "";
  }

  function loadDict(lang, cb){
    if(CACHE[lang]){
      cb(CACHE[lang]);
      return;
    }
    var url = getBasePrefix() + "i18n/" + encodeURIComponent(lang) + ".json";
    fetch(url, {credentials: "same-origin"})
      .then(function(r){ return r.ok ? r.json() : {}; })
      .then(function(data){
        CACHE[lang] = data || {};
        cb(CACHE[lang]);
      })
      .catch(function(){
        CACHE[lang] = {};
        cb(CACHE[lang]);
      });
  }

  function translateString(orig, lang, dict){
    if(dict && Object.prototype.hasOwnProperty.call(dict, orig)) return dict[orig];
    var m = /^Showing (\d+) of (\d+) engagements$/i.exec(orig);
    if(m && COUNTS[lang]){
      return COUNTS[lang].replace("{0}", m[1]).replace("{1}", m[2]);
    }
    return orig;
  }

  function syncHeaderUI(lang){
    var codeEl = document.getElementById("langBtnCode");
    if(codeEl) codeEl.textContent = BADGES[lang] || "EN";
    var opts = document.querySelectorAll(".lang-opt[data-set-lang]");
    for(var i = 0; i < opts.length; i++){
      var active = opts[i].getAttribute("data-set-lang") === lang;
      opts[i].classList.toggle("active", active);
      opts[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function applyDomTranslation(lang, dict){
    var root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    syncHeaderUI(lang);

    var fixedLang = root.getAttribute("data-fixed-lang");
    if(fixedLang) return;

    document.title = translateString(norm(origTitle), lang, dict);

    if(!document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        var p = node.parentElement;
        if(!p) return NodeFilter.FILTER_REJECT;
        var tn = p.tagName;
        if(tn === "SCRIPT" || tn === "STYLE" || tn === "NOSCRIPT" || tn === "SVG") return NodeFilter.FILTER_REJECT;
        if(p.closest("[data-i18n-skip='1']")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while((n = walker.nextNode())){
      if(typeof n.__mmOrig !== "string"){
        n.__mmOrig = n.nodeValue;
      }
      var raw = n.__mmOrig;
      var key = norm(raw);
      if(!key || key.length < 2) continue;
      var tr = translateString(key, lang, dict);
      if(tr !== key){
        var lead = (/^\s+/.exec(raw) || [""])[0];
        var trail = (/\s+$/.exec(raw) || [""])[0];
        n.nodeValue = lead + tr + trail;
      } else if(n.nodeValue !== raw){
        n.nodeValue = raw;
      }
    }

    var els = document.querySelectorAll("[placeholder],[data-desc],[data-cat-label]");
    for(var j = 0; j < els.length; j++){
      var el = els[j];
      if(el.closest("[data-i18n-skip='1']")) continue;
      var attrs = ["placeholder", "data-desc", "data-cat-label"];
      for(var k = 0; k < attrs.length; k++){
        var a = attrs[k];
        if(!el.hasAttribute(a)) continue;
        var prop = "__mmOrig_" + a;
        if(typeof el[prop] !== "string") el[prop] = norm(el.getAttribute(a));
        var origVal = el[prop];
        if(origVal) el.setAttribute(a, translateString(origVal, lang, dict));
      }
    }
  }

  function applyLanguage(lang, persist){
    if(VALID.indexOf(lang) === -1) lang = "en-US";
    currentLang = lang;
    if(persist){
      try { localStorage.setItem("mm-lang", lang); } catch(e){}
    }
    syncHeaderUI(lang);
    return new Promise(function(resolve){
      loadDict(lang, function(dict){
        if(currentLang === lang){
          applyDomTranslation(lang, dict);
        }
        resolve(lang);
      });
    });
  }

  var rc = document.getElementById("resultCount");
  if(rc && "MutationObserver" in window){
    var busy = false;
    new MutationObserver(function(){
      if(busy || currentLang === "en-US" || currentLang === "en-GB") return;
      var txt = norm(rc.textContent);
      var m = /^Showing (\d+) of (\d+) engagements$/i.exec(txt);
      if(m && COUNTS[currentLang]){
        busy = true;
        rc.textContent = COUNTS[currentLang].replace("{0}", m[1]).replace("{1}", m[2]);
        busy = false;
      }
    }).observe(rc, {childList: true, characterData: true, subtree: true});
  }

  var langBtn = document.getElementById("langBtn");
  var langModal = document.getElementById("langModal");
  function openLangModal(){
    if(!langModal) return;
    langModal.hidden = false;
    var first = langModal.querySelector(".lang-opt.active") || langModal.querySelector(".lang-opt");
    if(first) first.focus();
  }
  function closeLangModal(){
    if(!langModal) return;
    langModal.hidden = true;
    if(langBtn) langBtn.focus();
  }
  if(langBtn) langBtn.addEventListener("click", openLangModal);
  if(langModal){
    langModal.addEventListener("click", function(e){
      if(e.target === langModal || (e.target && e.target.closest("[data-action='close-lang']"))){
        closeLangModal();
        return;
      }
      var btn = e.target && e.target.closest(".lang-opt[data-set-lang]");
      if(btn){
        var target = btn.getAttribute("data-set-lang");
        if(document.documentElement.getAttribute("data-fixed-lang")){
          try { localStorage.setItem("mm-lang", target); } catch(err){}
          window.location.href = "../?lang=" + encodeURIComponent(target);
          return;
        }
        applyLanguage(target, true);
        closeLangModal();
      }
    });
  }
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && langModal && !langModal.hidden) closeLangModal();
  });

  window.MM_I18N = {
    setLanguage: function(l){ return applyLanguage(l, true); },
    getLanguage: function(){ return currentLang; },
    languages: VALID
  };

  var fixed = document.documentElement.getAttribute("data-fixed-lang");
  var qLang = getQueryLang();
  var saved = null;
  try { saved = localStorage.getItem("mm-lang"); } catch(e){}
  if(saved && VALID.indexOf(saved) === -1) saved = null;

  if(fixed && VALID.indexOf(fixed) !== -1){
    currentLang = fixed;
    syncHeaderUI(fixed);
  } else if(qLang){
    applyLanguage(qLang, true);
  } else if(saved){
    applyLanguage(saved, false);
  } else if(!isCrawler()){
    var detected = matchBrowserLang();
    if(detected !== "en-US"){
      applyLanguage(detected, false);
    } else {
      syncHeaderUI("en-US");
    }
  }
})();
