import { Router } from 'express'
import { getDb } from './db.js'

export const tagsRouter = Router()

// list all tags with usage count
tagsRouter.get('/', async (req, res) => {
  const db = await getDb()
  const rows = db.all(`
    SELECT t.id, t.name, COUNT(dt.dream_id) as usage
    FROM tags t
    LEFT JOIN dream_tags dt ON dt.tag_id = t.id
    GROUP BY t.id
    ORDER BY usage DESC, t.name ASC
  `)
  res.json(rows)
})

// create a tag (admin-like; optional)
tagsRouter.post('/', async (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name required' })
  const db = await getDb()
  const exists = db.get('SELECT id FROM tags WHERE name = ?', name)
  if (exists) return res.status(409).json({ message: 'exists' })
  const { lastID } = db.run('INSERT INTO tags (name) VALUES (?)', name)
  res.status(201).json({ id: lastID, name })
})


