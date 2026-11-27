-- Cloudflare D1 setup (run: npx wrangler d1 execute mithun_portfolio --file=worker/sql/d1.sql)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  lang TEXT DEFAULT 'en',
  ip_hash TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS reviews_approved_idx ON reviews (approved, created_at DESC);
