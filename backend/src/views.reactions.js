import { Router } from 'express'
import { getDb } from './db.js'

export const reactionsRouter = Router()

// toggle like
reactionsRouter.post('/like/:dreamId', async (req, res) => {
  const db = await getDb()
  const existing = db.get('SELECT id FROM reactions WHERE dream_id = ? AND user_id = ? AND type = ?',
    req.params.dreamId, req.userId, 'like')
  if (existing) {
    db.run('DELETE FROM reactions WHERE id = ?', existing.id)
    return res.json({ liked: false })
  } else {
    db.run('INSERT INTO reactions (dream_id, user_id, type) VALUES (?,?,?)', req.params.dreamId, req.userId, 'like')
    return res.json({ liked: true })
  }
})

reactionsRouter.get('/count/:dreamId', async (req, res) => {
  const db = await getDb()
  const row = db.get('SELECT COUNT(1) as n FROM reactions WHERE dream_id = ? AND type = ?',
    req.params.dreamId, 'like')
  res.json({ likes: row?.n || 0 })
})


