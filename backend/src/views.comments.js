import { Router } from 'express'
import { getDb } from './db.js'

export const commentsRouter = Router()

// list comments of a dream
commentsRouter.get('/dream/:dreamId', async (req, res) => {
  const db = await getDb()
  const rows = db.all(`
    SELECT c.*, u.email as author_email
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.dream_id = ?
    ORDER BY c.created_at ASC
  `, req.params.dreamId)
  res.json(rows)
})

// add comment
commentsRouter.post('/', async (req, res) => {
  const { dream_id, content } = req.body || {}
  if (!dream_id || !content) return res.status(400).json({ message: 'dream_id/content required' })
  const db = await getDb()
  const own = db.get('SELECT id FROM dreams WHERE id = ? AND user_id = ?', dream_id, req.userId)
  // 允许非作者评论，故不校验 own；只校验 dream 存在
  const exists = db.get('SELECT id FROM dreams WHERE id = ?', dream_id)
  if (!exists) return res.status(404).json({ message: 'dream not found' })
  const { lastID } = db.run('INSERT INTO comments (dream_id, user_id, content) VALUES (?,?,?)', dream_id, req.userId, content)
  const row = db.get('SELECT * FROM comments WHERE id = ?', lastID)
  res.status(201).json(row)
})

// delete comment (only author)
commentsRouter.delete('/:id', async (req, res) => {
  const db = await getDb()
  const row = db.get('SELECT id, user_id FROM comments WHERE id = ?', req.params.id)
  if (!row) return res.status(404).json({ message: 'not found' })
  if (row.user_id !== req.userId) return res.status(403).json({ message: 'forbidden' })
  db.run('DELETE FROM comments WHERE id = ?', req.params.id)
  res.status(204).send()
})


