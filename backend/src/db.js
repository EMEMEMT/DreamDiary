import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

// 默认放在 backend/data/dreams.sqlite（避免出现 backend/backend/... 的重复路径）
const dbFile = process.env.DB_FILE || path.join(process.cwd(), 'data', 'dreams.sqlite')

let singleton
export async function getDb() {
  const dir = path.dirname(dbFile)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!singleton) {
    const db = new Database(dbFile)
    db.pragma('foreign_keys = ON')
    migrate(db)
    singleton = wrap(db)
  }
  return singleton
}

function wrap(db) {
  return {
    exec(sql) { db.exec(sql) },
    get(sql, ...params) { return db.prepare(sql).get(...params) },
    all(sql, ...params) { return db.prepare(sql).all(...params) },
    run(sql, ...params) { const info = db.prepare(sql).run(...params); return { lastID: info.lastInsertRowid, changes: info.changes } }
  }
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dreams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      date TEXT,
      content TEXT,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_dreams_user ON dreams(user_id);

    -- tags 与多对多关联
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dream_tags (
      dream_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (dream_id, tag_id),
      FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 评论
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 点赞/反应
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT ('like'),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (dream_id, user_id, type),
      FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 附件（仅存路径/URL）
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
    );
  `)

  // 兼容旧库：如无 is_public 字段则补齐
  try {
    const cols = db.prepare(`PRAGMA table_info(dreams)`).all()
    const hasIsPublic = cols.some(c => c.name === 'is_public')
    if (!hasIsPublic) {
      db.exec(`ALTER TABLE dreams ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;`)
    }
  } catch {}

  // 兼容旧库：users 添加 username 字段（可空以避免历史冲突），并尝试给空值填充占位
  try {
    const userCols = db.prepare(`PRAGMA table_info(users)`).all()
    const hasUsername = userCols.some(c => c.name === 'username')
    if (!hasUsername) {
      db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`)
      // 尝试用邮箱@前缀填充 username（如冲突则忽略）
      const users = db.prepare(`SELECT id, email FROM users`).all()
      const used = new Set(db.prepare(`SELECT username FROM users WHERE username IS NOT NULL`).all().map(r => r.username))
      for (const u of users) {
        const base = String(u.email || '')
        const suggestion = base.includes('@') ? base.split('@')[0] : base
        if (!suggestion) continue
        let candidate = suggestion
        let i = 1
        while (used.has(candidate)) candidate = `${suggestion}${++i}`
        db.prepare(`UPDATE users SET username = ? WHERE id = ? AND username IS NULL`).run(candidate, u.id)
        used.add(candidate)
      }
    }
  } catch {}
}

export function serializeTags(arr) {
  return (Array.isArray(arr) ? arr : []).map(s => String(s).trim()).filter(Boolean)
}

