import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDb } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const JWT_EXPIRES_IN = '7d'

export async function register(req, res) {
  const { email, password, username } = req.body || {}
  if (!email || !password || !username) return res.status(400).json({ message: 'email/password/username required' })
  const db = await getDb()
  const exists = db.get('SELECT id FROM users WHERE email = ?', email)
  if (exists) return res.status(409).json({ message: 'email used' })
  const nameExists = db.get('SELECT id FROM users WHERE username = ?', username)
  if (nameExists) return res.status(409).json({ message: 'username used' })
  const hash = await bcrypt.hash(password, 10)
  const { lastID } = db.run('INSERT INTO users (email, username, password_hash) VALUES (?,?,?)', email, username, hash)
  const token = jwt.sign({ sub: lastID }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  return res.status(201).json({ token, user: { id: lastID, email, username } })
}

export async function login(req, res) {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ message: 'email/password required' })
  const db = await getDb()
  const row = db.get('SELECT id, username, password_hash FROM users WHERE email = ?', email)
  if (!row) return res.status(401).json({ message: 'invalid credentials' })
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) return res.status(401).json({ message: 'invalid credentials' })
  const token = jwt.sign({ sub: row.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  return res.json({ token, user: { id: row.id, email, username: row.username } })
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'missing token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ message: 'invalid token' })
  }
}


