// Cloudflare Pages Function — dynamic Open Graph / meta endpoint (v2026-11)
// File path: functions/share.js  →  route: /share
//
// WHY: index.html is a 167 KB single-page file. Social crawlers (WhatsApp, LinkedIn,
// Facebook) stop parsing after the first ~100 KB, so tags at the end get ignored and
// previews break. This endpoint returns a tiny per-language OG document that
// redirects humans straight to the real page, and rewrites the ?share=1 deep links
// in one place. Zero dependencies, runs on Pages Functions (Workers runtime).

const SITE = 'https://mithun-mutsuddi.github.io';

const LANGS = {
  'en-us': { label: 'English (USA)', to: '/' },
  'en-gb': { label: 'English (UK)', to: '/en-gb/' },
  'bn':    { label: 'বাংলা', to: '/bn/' },
  'ar':    { label: 'العربية', to: '/ar/' },
  'zh-cn': { label: '中文 (简体)', to: '/zh-cn/' },
  'zh-tw': { label: '中文 (繁體)', to: '/zh-tw/' },
  'ja':    { label: '日本語', to: '/ja/' },
  'de':    { label: 'Deutsch', to: '/de/' },
  'fr':    { label: 'Français', to: '/fr/' },
  'es':    { label: 'Español', to: '/es/' },
  'pt':    { label: 'Português', to: '/pt/' },
  'ru':    { label: 'Русский', to: '/ru/' },
  'it':    { label: 'Italiano', to: '/it/' }
};

const OG = {
  title: 'Mithun Mutsuddi, CA(cc) | Finance, Audit & Governance Professional',
  desc: 'Internal Audit, Statutory & Forensic Audit, ERP Controls and Cost Management — 8.5+ years across manufacturing, RMG, NGO & corporate sectors in Bangladesh.',
  image: SITE + '/images/og-card.jpg',
  imageAlt: 'Mithun Mutsuddi, CA(cc) — 29 verified audit engagements'
};

export function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lang = (url.searchParams.get('lang') || '').toLowerCase();
  const target = (LANGS[lang] && LANGS[lang].to) || '/';
  const isHuman = /Mozilla|Chrome|Safari/i.test(context.request.headers.get('user-agent') || '');

  // Humans: straight to the real page (must be a 302 so crawlers keep reading this doc)
  if (isHuman && !/bot|crawl|spider|facebook|whatsapp|linkedin|twitter/i.test(context.request.headers.get('user-agent') || '')) {
    return Response.redirect(`${SITE}${target}`, 302);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${OG.title}</title>
<meta name="description" content="${OG.desc}">
<link rel="canonical" href="${SITE}${target}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Mithun Mutsuddi">
<meta property="og:title" content="${OG.title}">
<meta property="og:description" content="${OG.desc}">
<meta property="og:url" content="${SITE}${target}">
<meta property="og:image" content="${OG.image}">
<meta property="og:image:secure_url" content="${OG.image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${OG.imageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${OG.title}">
<meta name="twitter:description" content="${OG.desc}">
<meta name="twitter:image" content="${OG.image}">
<noscript><meta http-equiv="refresh" content="0;url=${SITE}${target}"></noscript>
</head>
<body>
<p>Redirecting to <a href="${SITE}${target}">Mithun Mutsuddi's portfolio</a>…</p>
<script>location.replace(${JSON.stringify(SITE + target)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-robots-tag': 'noindex',
      'access-control-allow-origin': '*'
    }
  });
}
