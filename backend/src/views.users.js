import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { getDb } from './db.js'

export const usersRouter = Router()

// 配置 multer 用于头像上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 使用用户ID和时间戳生成唯一文件名
    const ext = path.extname(file.originalname)
    const filename = `avatar_${req.userId}_${Date.now()}${ext}`
    cb(null, filename)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'), false)
    }
  }
})

// 当前用户信息与统计
usersRouter.get('/me', async (req, res) => {
  const db = await getDb()
  const user = db.get('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?', req.userId)
  const stats = db.get(`
    SELECT 
      (SELECT COUNT(1) FROM dreams d WHERE d.user_id = u.id) as total_dreams,
      (SELECT COUNT(1) FROM dreams d WHERE d.user_id = u.id AND d.is_public = 1) as public_dreams
    FROM users u WHERE u.id = ?
  `, req.userId)
  res.json({ ...user, ...stats })
})

// 上传头像
usersRouter.post('/me/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的头像文件' })
    }

    const db = await getDb()
    
    // 获取当前用户信息，删除旧头像文件
    const user = db.get('SELECT avatar_url FROM users WHERE id = ?', req.userId)
    if (user?.avatar_url) {
      const oldAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(user.avatar_url))
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath)
      }
    }

    // 更新数据库中的头像URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`
    db.run('UPDATE users SET avatar_url = ? WHERE id = ?', avatarUrl, req.userId)

    res.json({ 
      message: '头像上传成功', 
      avatar_url: avatarUrl 
    })
  } catch (error) {
    console.error('头像上传错误:', error)
    res.status(500).json({ message: '头像上传失败' })
  }
})

// 删除头像
usersRouter.delete('/me/avatar', async (req, res) => {
  try {
    const db = await getDb()
    
    // 获取当前用户信息
    const user = db.get('SELECT avatar_url FROM users WHERE id = ?', req.userId)
    if (user?.avatar_url) {
      // 删除文件
      const avatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(user.avatar_url))
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath)
      }
      
      // 更新数据库
      db.run('UPDATE users SET avatar_url = NULL WHERE id = ?', req.userId)
    }

    res.json({ message: '头像删除成功' })
  } catch (error) {
    console.error('头像删除错误:', error)
    res.status(500).json({ message: '头像删除失败' })
  }
})

// 获取用户基本信息（包含头像，用于显示）
usersRouter.get('/:id', async (req, res) => {
  const db = await getDb()
  const user = db.get('SELECT id, username, avatar_url, created_at FROM users WHERE id = ?', req.params.id)
  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }
  res.json(user)
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


