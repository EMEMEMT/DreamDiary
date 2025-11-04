import { Router } from 'express'
import { getDb, serializeTags } from './db.js'

export const dreamsRouter = Router()

// list
dreamsRouter.get('/', async (req, res) => {
  const db = await getDb()
  const { tag } = req.query
  
  let rows
  if (tag) {
    // 按标签筛选梦境
    rows = db.all(`
      SELECT DISTINCT d.* FROM dreams d
      JOIN dream_tags dt ON dt.dream_id = d.id
      JOIN tags t ON t.id = dt.tag_id
      WHERE d.user_id = ? AND t.name = ?
      ORDER BY d.date DESC NULLS LAST, d.created_at DESC
    `, req.userId, tag)
  } else {
    // 获取所有梦境
    rows = db.all('SELECT * FROM dreams WHERE user_id = ? ORDER BY date DESC NULLS LAST, created_at DESC', req.userId)
  }
  
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

// 个人统计（需登录）：频率与标签占比（注意：需放在 '/:id' 之前）
dreamsRouter.get('/stats', async (req, res) => {
  const db = await getDb()
  const range = normalizeRange(req.query.range)
  const { start, end } = computeRange(range)

  const freqRows = db.all(
    `SELECT DATE(COALESCE(d.date, d.created_at)) as day, COUNT(1) as cnt
     FROM dreams d
     WHERE d.user_id = ? AND DATE(COALESCE(d.date, d.created_at)) BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day ASC`,
    req.userId, start, end
  )
  const frequency = fillDateSeries(start, end, freqRows)

  const tagRows = db.all(
    `SELECT t.name as name, COUNT(1) as value
     FROM dreams d
     JOIN dream_tags dt ON dt.dream_id = d.id
     JOIN tags t ON t.id = dt.tag_id
     WHERE d.user_id = ? AND DATE(COALESCE(d.date, d.created_at)) BETWEEN ? AND ?
     GROUP BY t.name
     ORDER BY value DESC`,
    req.userId, start, end
  )
  const tags = topNWithOthers(tagRows, 10)

  res.json({ scope: 'me', range, start, end, frequency, tags })
})

// 已上移到 '/stats'（见文件上方）

// get
dreamsRouter.get('/:id', async (req, res) => {
  const db = await getDb()
  const row = db.get(`
    SELECT d.*, u.username as author_username, u.avatar_url as author_avatar
    FROM dreams d 
    JOIN users u ON u.id = d.user_id
    WHERE d.id = ? AND d.user_id = ?
  `, req.params.id, req.userId)
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
  const { tag } = req.query
  
  let rows
  if (tag) {
    // 按标签筛选公开梦境
    rows = db.all(`
      SELECT DISTINCT d.*, u.email as author_email, u.username as author_username, u.avatar_url as author_avatar,
        (SELECT COUNT(1) FROM reactions r WHERE r.dream_id = d.id) as likes,
        (SELECT COUNT(1) FROM comments c WHERE c.dream_id = d.id) as comments
      FROM dreams d 
      JOIN users u ON u.id = d.user_id
      JOIN dream_tags dt ON dt.dream_id = d.id
      JOIN tags t ON t.id = dt.tag_id
      WHERE d.is_public = 1 AND t.name = ?
      ORDER BY d.date DESC NULLS LAST, d.created_at DESC
    `, tag)
  } else {
    // 获取所有公开梦境
    rows = db.all(`
      SELECT d.*, u.email as author_email, u.username as author_username, u.avatar_url as author_avatar,
        (SELECT COUNT(1) FROM reactions r WHERE r.dream_id = d.id) as likes,
        (SELECT COUNT(1) FROM comments c WHERE c.dream_id = d.id) as comments
      FROM dreams d JOIN users u ON u.id = d.user_id
      WHERE d.is_public = 1
      ORDER BY d.date DESC NULLS LAST, d.created_at DESC
    `)
  }
  
  // 为公开梦境添加标签信息
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

// 公共统计（无需登录）：频率与标签占比
publicDreamsRouter.get('/stats', async (req, res) => {
  const db = await getDb()
  const range = normalizeRange(req.query.range)
  const { start, end } = computeRange(range)

  // 频率：按天统计公开梦境
  const freqRows = db.all(
    `SELECT DATE(COALESCE(d.date, d.created_at)) as day, COUNT(1) as cnt
     FROM dreams d
     WHERE d.is_public = 1 AND DATE(COALESCE(d.date, d.created_at)) BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day ASC`,
    start, end
  )
  const frequency = fillDateSeries(start, end, freqRows)

  // 标签分布：统计范围内公开梦境的标签计数
  const tagRows = db.all(
    `SELECT t.name as name, COUNT(1) as value
     FROM dreams d
     JOIN dream_tags dt ON dt.dream_id = d.id
     JOIN tags t ON t.id = dt.tag_id
     WHERE d.is_public = 1 AND DATE(COALESCE(d.date, d.created_at)) BETWEEN ? AND ?
     GROUP BY t.name
     ORDER BY value DESC`,
    start, end
  )
  const tags = topNWithOthers(tagRows, 10)

  res.json({ scope: 'public', range, start, end, frequency, tags })
})

// public dream detail
publicDreamsRouter.get('/:id', async (req, res) => {
  const db = await getDb()
  const d = db.get(`
    SELECT d.*, u.email as author_email, u.username as author_username, u.avatar_url as author_avatar,
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
  // 清理孤立标签
  cleanupOrphanTags(db)
  res.status(204).send()
})

// （已移动到文件前部，避免被 '/:id' 截获）

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
  cleanupOrphanTags(db)
}


// ------- 辅助函数（仅本文件使用） -------
function normalizeRange(raw) {
  const v = String(raw || '').toLowerCase()
  if (v === '7d' || v === '7') return '7d'
  if (v === '30d' || v === '30') return '30d'
  if (v === '1y' || v === '365d' || v === 'year') return '1y'
  return '7d'
}

function computeRange(range) {
  const endDate = new Date()
  endDate.setHours(0, 0, 0, 0)
  const startDate = new Date(endDate)
  if (range === '30d') startDate.setDate(startDate.getDate() - 29)
  else if (range === '1y') startDate.setDate(startDate.getDate() - 364)
  else startDate.setDate(startDate.getDate() - 6)
  return { start: toYMD(startDate), end: toYMD(endDate) }
}

function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addOneDayStr(s) {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  return toYMD(dt)
}

function fillDateSeries(start, end, rows) {
  const map = new Map(rows.map(r => [r.day, Number(r.cnt) || 0]))
  const series = []
  for (let cur = start; ; cur = addOneDayStr(cur)) {
    series.push({ date: cur, count: map.get(cur) || 0 })
    if (cur === end) break
  }
  return series
}

function topNWithOthers(rows, n) {
  const list = rows.map(r => ({ name: r.name, value: Number(r.value) || 0 }))
  list.sort((a, b) => b.value - a.value)
  const top = list.slice(0, n)
  const othersVal = list.slice(n).reduce((s, x) => s + x.value, 0)
  if (othersVal > 0) top.push({ name: '其他', value: othersVal })
  return top
}

// 删除未被任何梦境引用的标签
function cleanupOrphanTags(db) {
  db.run(`
    DELETE FROM tags
    WHERE id IN (
      SELECT t.id FROM tags t
      LEFT JOIN dream_tags dt ON dt.tag_id = t.id
      WHERE dt.tag_id IS NULL
    )
  `)
}


