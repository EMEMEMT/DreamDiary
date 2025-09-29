import { Router } from 'express'
import { getDb, serializeTags } from './db.js'

export const dreamsRouter = Router()

// list
dreamsRouter.get('/', async (req, res) => {
  const db = await getDb()
  const rows = db.all('SELECT * FROM dreams WHERE user_id = ? ORDER BY date DESC NULLS LAST, created_at DESC', req.userId)
  // join tags
  const dreamIds = rows.map(r => r.id)
  const tagRows = dreamIds.length ? db.all(`
    SELECT dt.dream_id, t.name FROM dream_tags dt
    JOIN tags t ON t.id = dt.tag_id
    WHERE dt.dream_id IN (${dreamIds.map(() => '?').join(',')})
  `, ...dreamIds) : []
  const idToTags = new Map()
  for (const tr of tagRows) {
    if (!idToTags.has(tr.dream_id)) idToTags.set(tr.dream_id, [])
    idToTags.get(tr.dream_id).push(tr.name)
  }
  const data = rows.map(r => ({ ...r, tags: idToTags.get(r.id) || [] }))
  res.json(data)
})

// get
dreamsRouter.get('/:id', async (req, res) => {
  const db = await getDb()
  const row = db.get('SELECT * FROM dreams WHERE id = ? AND user_id = ?', req.params.id, req.userId)
  if (!row) return res.status(404).json({ message: 'not found' })
  const tags = db.all(`
    SELECT t.name FROM dream_tags dt JOIN tags t ON t.id = dt.tag_id
    WHERE dt.dream_id = ?
  `, req.params.id).map(r => r.name)
  res.json({ ...row, tags })
})

// create
dreamsRouter.post('/', async (req, res) => {
  const { title, date, content, tags = [], is_public = 0 } = req.body || {}
  const db = await getDb()
  const { lastID } = db.run(
    'INSERT INTO dreams (user_id, title, date, content, is_public) VALUES (?,?,?,?,?)',
    req.userId, title || null, date || null, content || '', is_public ? 1 : 0
  )
  upsertTags(db, lastID, serializeTags(tags))
  const row = db.get('SELECT * FROM dreams WHERE id = ?', lastID)
  res.status(201).json({ ...row, tags: serializeTags(tags) })
})

// update
dreamsRouter.put('/:id', async (req, res) => {
  const { title, date, content, tags = [], is_public } = req.body || {}
  const db = await getDb()
  const own = db.get('SELECT id FROM dreams WHERE id = ? AND user_id = ?', req.params.id, req.userId)
  if (!own) return res.status(404).json({ message: 'not found' })
  const publicSql = (typeof is_public === 'undefined') ? '' : ', is_public = ?'
  const params = [title || null, date || null, content || '']
  if (publicSql) params.push(is_public ? 1 : 0)
  params.push(req.params.id)
  db.run(`UPDATE dreams SET title = ?, date = ?, content = ?${publicSql}, updated_at = datetime('now') WHERE id = ?`, ...params)
  replaceTags(db, req.params.id, serializeTags(tags))
  const row = db.get('SELECT * FROM dreams WHERE id = ?', req.params.id)
  res.json({ ...row, tags: serializeTags(tags) })
})

// public feed (no auth)
export const publicDreamsRouter = Router()
publicDreamsRouter.get('/', async (req, res) => {
  const db = await getDb()
  const rows = db.all(`
    SELECT d.*, u.email as author_email, u.username as author_username,
      (SELECT COUNT(1) FROM reactions r WHERE r.dream_id = d.id) as likes,
      (SELECT COUNT(1) FROM comments c WHERE c.dream_id = d.id) as comments
    FROM dreams d JOIN users u ON u.id = d.user_id
    WHERE d.is_public = 1
    ORDER BY d.date DESC NULLS LAST, d.created_at DESC
  `)
  res.json(rows)
})

// public dream detail
publicDreamsRouter.get('/:id', async (req, res) => {
  const db = await getDb()
  const d = db.get(`
    SELECT d.*, u.email as author_email, u.username as author_username,
      (SELECT COUNT(1) FROM reactions r WHERE r.dream_id = d.id) as likes,
      (SELECT COUNT(1) FROM comments c WHERE c.dream_id = d.id) as comments
    FROM dreams d JOIN users u ON u.id = d.user_id
    WHERE d.id = ? AND d.is_public = 1
  `, req.params.id)
  if (!d) return res.status(404).json({ message: 'not found' })
  const tags = db.all(`
    SELECT t.name FROM dream_tags dt JOIN tags t ON t.id = dt.tag_id
    WHERE dt.dream_id = ?
  `, req.params.id).map(r => r.name)
  res.json({ ...d, tags })
})

// delete
dreamsRouter.delete('/:id', async (req, res) => {
  const db = await getDb()
  const ret = db.run('DELETE FROM dreams WHERE id = ? AND user_id = ?', req.params.id, req.userId)
  if (ret.changes === 0) return res.status(404).json({ message: 'not found' })
  res.status(204).send()
})

function upsertTags(db, dreamId, tags) {
  for (const name of tags) {
    const row = db.get('SELECT id FROM tags WHERE name = ?', name)
    const tagId = row ? row.id : db.run('INSERT INTO tags (name) VALUES (?)', name).lastID
    db.run('INSERT OR IGNORE INTO dream_tags (dream_id, tag_id) VALUES (?,?)', dreamId, tagId)
  }
}

function replaceTags(db, dreamId, tags) {
  db.run('DELETE FROM dream_tags WHERE dream_id = ?', dreamId)
  upsertTags(db, dreamId, tags)
}


