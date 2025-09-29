import { Router } from 'express'
import { getDb } from './db.js'

export const usersRouter = Router()

// 当前用户信息与统计
usersRouter.get('/me', async (req, res) => {
  const db = await getDb()
  const user = db.get('SELECT id, email, username, created_at FROM users WHERE id = ?', req.userId)
  const stats = db.get(`
    SELECT 
      (SELECT COUNT(1) FROM dreams d WHERE d.user_id = u.id) as total_dreams,
      (SELECT COUNT(1) FROM dreams d WHERE d.user_id = u.id AND d.is_public = 1) as public_dreams
    FROM users u WHERE u.id = ?
  `, req.userId)
  res.json({ ...user, ...stats })
})

// 某用户的公开梦境列表（用于个人主页展示）
usersRouter.get('/:id/public-dreams', async (req, res) => {
  const db = await getDb()
  const rows = db.all(`
    SELECT d.*, 
      (SELECT COUNT(1) FROM reactions r WHERE r.dream_id = d.id) as likes,
      (SELECT COUNT(1) FROM comments c WHERE c.dream_id = d.id) as comments
    FROM dreams d
    WHERE d.user_id = ? AND d.is_public = 1
    ORDER BY d.date DESC NULLS LAST, d.created_at DESC
  `, req.params.id)
  res.json(rows)
})


