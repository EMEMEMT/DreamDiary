import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { getDb } from './db.js'
import { register, login, authMiddleware } from './auth.js'
import { dreamsRouter, publicDreamsRouter } from './views.dreams.js'
import { tagsRouter } from './views.tags.js'
import { reactionsRouter } from './views.reactions.js'
import { commentsRouter } from './views.comments.js'
import { usersRouter } from './views.users.js'

const app = express()
const PORT = process.env.PORT || 3000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (req, res) => res.json({ ok: true }))

app.post('/auth/register', register)
app.post('/auth/login', login)

app.use('/dreams', authMiddleware, dreamsRouter)
app.use('/public/dreams', publicDreamsRouter)
app.use('/tags', authMiddleware, tagsRouter)
app.use('/comments', authMiddleware, commentsRouter)
app.use('/reactions', authMiddleware, reactionsRouter)
app.use('/users', authMiddleware, usersRouter)

app.use((req, res) => res.status(404).json({ message: 'not found' }))

await getDb()
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`))


