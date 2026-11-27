/**
 * Mithun Mutsuddi — Portfolio API
 * Cloudflare Workers backend (v2026-11)
 *
 * Endpoints
 *   GET  /api/health         → which integrations are configured
 *   POST /api/contact        → validated contact message → email via Resend
 *   POST /api/cv-request     → CV access request → email via Resend
 *   POST /api/review         → visitor review → stored in Supabase/D1/Neon (pending)
 *   GET  /api/reviews        → approved reviews (public, cached)
 *   POST /api/ai             → optional "ask about my experience" (Workers AI)
 *
 * Free-tier friendly: no npm dependencies, no node APIs, only fetch + bindings.
 * Secrets (set with `wrangler secret put NAME`):
 *   RESEND_API_KEY, OWNER_EMAIL, FROM_EMAIL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY           (option 1 database)
 *   DATABASE_URL                                       (option 2: Neon, experimental)
 * Bindings (wrangler.toml):
 *   RATE_KV (KV namespace)  – optional, in-memory limiter used otherwise
 *   DB (D1 database)        – optional database option 3
 *   AI (Workers AI)         – optional /api/ai
 */

const SITE = 'https://mithun-mutsuddi.github.io';
const ALLOWED_ORIGINS = [
  'https://mithun-mutsuddi.github.io',
  'https://mithun-mutsuddi.pages.dev',
  'http://localhost:8788'
];
const MAX_BODY = 16 * 1024;         // 16 KB hard cap
const RATE_WINDOW = 60;             // seconds
const RATE_LIMIT = 5;               // requests per window per IP+route
const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/* ------------------------------ helpers ------------------------------ */

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

function json(data, status = 200, origin = '', extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...cors(origin),
      ...extra
    }
  });
}

function cleanLine(s, max = 120) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
}
function cleanBlock(s, max = 1500) {
  return String(s || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, '').trim().slice(0, max);
}
function isEmail(s) {
  return /^[^\s@<>()[\]\\.,;:"]+(\.[^\s@<>()[\]\\.,;:"]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s) && s.length <= 120;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clientIp(req) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '0.0.0.0';
}

/* --------------------------- rate limiting --------------------------- */
const memHit = new Map(); // fallback: per-isolate (best effort)

async function limited(env, key) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `rl:${key}:${Math.floor(now / RATE_WINDOW)}`;
  if (env.RATE_KV) {
    const n = parseInt((await env.RATE_KV.get(bucket)) || '0', 10) + 1;
    await env.RATE_KV.put(bucket, String(n), { expirationTtl: RATE_WINDOW * 2 });
    return n > RATE_LIMIT;
  }
  const n = (memHit.get(bucket) || 0) + 1;
  memHit.set(bucket, n);
  if (memHit.size > 5000) memHit.clear();
  return n > RATE_LIMIT;
}

/* ------------------------------ email ------------------------------- */
async function sendEmail(env, subject, html, replyTo) {
  if (!env.RESEND_API_KEY) return { ok: false, skipped: 'RESEND_API_KEY missing' };
  const from = env.FROM_EMAIL || 'Portfolio <onboarding@resend.dev>';
  const to = env.OWNER_EMAIL || 'mithuncacc96@gmail.com';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo || undefined })
  });
  return { ok: res.ok, status: res.status, body: res.ok ? null : (await res.text()).slice(0, 300) };
}

function emailShell(title, rows) {
  const tr = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font:600 13px Arial;color:#555;white-space:nowrap">${esc(k)}</td>` +
    `<td style="padding:6px 12px;border-bottom:1px solid #eee;font:13px Arial;color:#111">${esc(v).replace(/\n/g, '<br>')}</td></tr>`
  ).join('');
  return `<div style="max-width:560px;margin:0 auto;border:1px solid #C6A66B;border-radius:12px;overflow:hidden">
    <div style="background:#101D36;color:#C6A66B;padding:14px 18px;font:700 15px Arial">${esc(title)}</div>
    <table style="border-collapse:collapse;width:100%">${tr}</table>
    <div style="padding:10px 18px;color:#888;font:11px Arial">Sent from mithun-mutsuddi portfolio · ${new Date().toISOString()}</div>
  </div>`;
}

/* ------------------------------- db --------------------------------- */
// Option 1: Supabase REST (zero dependency, recommended on free tier)
async function dbInsert(env, table, row) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    return { ok: res.ok, via: 'supabase', status: res.status, body: res.ok ? null : (await res.text()).slice(0, 300) };
  }
  // Option 3: Cloudflare D1 binding
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO reviews (name, company, rating, comment, lang, ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(row.name, row.company, row.rating, row.comment, row.lang, row.ip_hash).run();
      return { ok: true, via: 'd1' };
    } catch (e) {
      return { ok: false, via: 'd1', body: String(e).slice(0, 300) };
    }
  }
  // Option 2: Neon over HTTP (Neon Data API / serverless driver compatible header)
  if (env.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL);
      const res = await fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'neon-connection-string': env.DATABASE_URL },
        body: JSON.stringify({
          query: `INSERT INTO reviews (name, company, rating, comment, lang, ip_hash, created_at)
                  VALUES ($1,$2,$3,$4,$5,$6, now())`,
          params: [row.name, row.company, row.rating, row.comment, row.lang, row.ip_hash]
        })
      });
      return { ok: res.ok, via: 'neon', status: res.status, body: res.ok ? null : (await res.text()).slice(0, 300) };
    } catch (e) {
      return { ok: false, via: 'neon', body: String(e).slice(0, 200) };
    }
  }
  return { ok: false, via: 'none', body: 'No database configured' };
}

async function dbListApproved(env, limit = 12) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const res = await fetch(
      `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/reviews?approved=eq.true&select=name,company,rating,comment,created_at&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!res.ok) return [];
    return res.json();
  }
  if (env.DB) {
    const r = await env.DB.prepare(
      'SELECT name, company, rating, comment, created_at FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all();
    return r.results || [];
  }
  return [];
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

/* --------------------------- turnstile (optional) --------------------------- */
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not enabled
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip });
  const res = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
  const out = await res.json().catch(() => ({}));
  return !!out.success;
}

async function readBody(req) {
  const len = +(req.headers.get('content-length') || 0);
  if (len && len > MAX_BODY) throw new Error('payload_too_large');
  const text = await req.text();
  if (text.length > MAX_BODY) throw new Error('payload_too_large');
  try {
    const o = JSON.parse(text);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/* ------------------------------ routes ------------------------------ */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    try {
      /* health -------------------------------------------------- */
      if (url.pathname === '/api/health') {
        return json({
          ok: true,
          time: new Date().toISOString(),
          email: !!env.RESEND_API_KEY,
          db: env.SUPABASE_URL ? 'supabase' : env.DB ? 'd1' : env.DATABASE_URL ? 'neon' : 'none',
          rateLimit: env.RATE_KV ? 'kv' : 'memory',
          ai: !!env.AI,
          turnstile: !!env.TURNSTILE_SECRET
        }, 200, origin);
      }

      /* contact ------------------------------------------------- */
      if (url.pathname === '/api/contact' && request.method === 'POST') {
        const ip = clientIp(request);
        if (await limited(env, `contact:${ip}`)) return json({ ok: false, error: 'rate_limited' }, 429, origin);

        const b = await readBody(request);
        if (b.website_hp) return json({ ok: true }); // honeypot: pretend success
        const name = cleanLine(b.name, 80);
        const email = cleanLine(b.email, 120);
        const message = cleanBlock(b.message, 1500);
        if (!name || !isEmail(email) || !message) return json({ ok: false, error: 'invalid_input' }, 422, origin);
        if (!(await turnstileOk(env, b.turnstileToken, ip))) return json({ ok: false, error: 'captcha' }, 403, origin);

        const mail = await sendEmail(
          env,
          `Portfolio contact — ${name}`,
          emailShell('New contact message', [['Name', name], ['Email', email], ['Message', message], ['IP', ip]]),
          email
        );
        return json({ ok: mail.ok, error: mail.ok ? undefined : 'mail_failed' }, mail.ok ? 200 : 502, origin);
      }

      /* cv request ---------------------------------------------- */
      if (url.pathname === '/api/cv-request' && request.method === 'POST') {
        const ip = clientIp(request);
        if (await limited(env, `cv:${ip}`)) return json({ ok: false, error: 'rate_limited' }, 429, origin);

        const b = await readBody(request);
        if (b.website_hp) return json({ ok: true });
        const name = cleanLine(b.name, 80);
        const org = cleanLine(b.org, 100);
        const email = cleanLine(b.email, 120);
        const phone = cleanLine(b.phone, 30);
        const purpose = cleanBlock(b.purpose, 800);
        if (!name || !org || !isEmail(email) || !phone || !purpose) return json({ ok: false, error: 'invalid_input' }, 422, origin);
        if (!(await turnstileOk(env, b.turnstileToken, ip))) return json({ ok: false, error: 'captcha' }, 403, origin);

        const mail = await sendEmail(
          env,
          `CV access request — ${name} (${org})`,
          emailShell('CV access request', [['Name', name], ['Organization', org], ['Email', email], ['Phone', phone], ['Purpose', purpose], ['IP', ip]]),
          email
        );
        return json({ ok: mail.ok, error: mail.ok ? undefined : 'mail_failed' }, mail.ok ? 200 : 502, origin);
      }

      /* review -------------------------------------------------- */
      if (url.pathname === '/api/review' && request.method === 'POST') {
        const ip = clientIp(request);
        if (await limited(env, `review:${ip}`)) return json({ ok: false, error: 'rate_limited' }, 429, origin);

        const b = await readBody(request);
        if (b.website_hp) return json({ ok: true });
        const name = cleanLine(b.name, 80);
        const company = cleanLine(b.company, 100);
        const rating = parseInt(b.rating, 10);
        const comment = cleanBlock(b.comment, 600);
        const lang = cleanLine(b.lang, 12) || 'en';
        if (!name || !comment || !(rating >= 1 && rating <= 5)) return json({ ok: false, error: 'invalid_input' }, 422, origin);
        if (!(await turnstileOk(env, b.turnstileToken, ip))) return json({ ok: false, error: 'captcha' }, 403, origin);

        const row = {
          name,
          company,
          rating,
          comment,
          lang,
          ip_hash: await sha256hex(ip + '|' + (env.IP_SALT || 'mm')),
          approved: false
        };
        const db = await dbInsert(env, 'reviews', row);

        // Owner always gets an email so nothing is lost even if the DB is down
        await sendEmail(env, `New review ${rating}/5 — ${name}`, emailShell('New visitor review', [
          ['Name', name], ['Company', company], ['Rating', `${rating}/5`], ['Review', comment], ['Lang', lang], ['Stored', db.ok ? db.via : 'NO — ' + (db.body || '')]
        ]));

        return json({ ok: true, stored: db.ok }, 200, origin);
      }

      /* reviews list -------------------------------------------- */
      if (url.pathname === '/api/reviews' && request.method === 'GET') {
        const rows = await dbListApproved(env, Math.min(parseInt(url.searchParams.get('limit') || '12', 10) || 12, 30));
        return json({ ok: true, reviews: rows }, 200, origin, { 'cache-control': 'public, max-age=300' });
      }

      /* ai (optional) ------------------------------------------- */
      if (url.pathname === '/api/ai' && request.method === 'POST') {
        if (!env.AI) return json({ ok: false, error: 'ai_not_configured' }, 501, origin);
        const ip = clientIp(request);
        if (await limited(env, `ai:${ip}`)) return json({ ok: false, error: 'rate_limited' }, 429, origin);
        const b = await readBody(request);
        const q = cleanBlock(b.q, 500);
        if (!q) return json({ ok: false, error: 'invalid_input' }, 422, origin);

        const system = [
          'You answer questions about Mithun Mutsuddi, a finance, audit and governance professional in Dhaka, Bangladesh.',
          'Facts: CA(cc) from ICAB articleship (M. Z. Islam & Co, 2021-2024); Assistant Manager Internal Audit at Agata Feed Mills Ltd since Dec 2025;',
          'previously Executive Finance & Accounts at Solar Electro Bangladesh Ltd; 29 featured audit engagements; ERP experience: Tally Prime, Autobiz, Oracle E-Business;',
          'sectors: manufacturing, RMG, NGO, corporate; skills: internal audit, statutory & forensic audit, SOP, inventory audit, tax & VAT, IFRS reporting.',
          'Answer in at most 90 words. If the question is off-topic, politely say you can only answer questions about his professional profile.',
          'Never invent employers, dates, certifications or client names beyond the facts above.'
        ].join(' ');

        const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'system', content: system }, { role: 'user', content: q }],
          max_tokens: 220
        });
        return json({ ok: true, answer: (out.response || '').trim() }, 200, origin);
      }

      return json({ ok: false, error: 'not_found' }, 404, origin);
    } catch (e) {
      const msg = String(e && e.message || e);
      const status = msg === 'payload_too_large' ? 413 : 500;
      return json({ ok: false, error: status === 413 ? 'payload_too_large' : 'server_error' }, status, origin);
    }
  }
};
