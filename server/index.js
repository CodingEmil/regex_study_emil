import express from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(REPO_ROOT, 'data', 'courses')

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const ID_RE = /^[a-z0-9]+$/i

const app = express()

app.use(express.json({ limit: '1mb' }))

// CORS for all origins (dev)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
})

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function generateId() {
  const time = Date.now().toString(36)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)]
  }
  return time + rand
}

function safeIdPath(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) return null
  return path.join(DATA_DIR, `${id}.json`)
}

app.get('/api/courses', async (_req, res) => {
  try {
    await ensureDataDir()
    const files = await fs.readdir(DATA_DIR)
    const items = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const id = file.slice(0, -5)
      if (!ID_RE.test(id)) continue
      try {
        const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8')
        const data = JSON.parse(raw)
        const course = data.course ?? {}
        const tasks = Array.isArray(data.tasks) ? data.tasks : []
        items.push({
          id,
          title: course.title ?? '(ohne Titel)',
          description: course.description,
          author: course.author,
          taskCount: tasks.length,
          savedAt: data._savedAt ?? 0,
        })
      } catch {
        // skip malformed file
      }
    }
    items.sort((a, b) => b.savedAt - a.savedAt)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' })
  }
})

app.get('/api/courses/:id', async (req, res) => {
  const filePath = safeIdPath(req.params.id)
  if (!filePath) {
    res.status(400).json({ error: 'Ungültige ID' })
    return
  }
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(raw)
    delete data._savedAt
    res.json(data)
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.status(404).json({ error: 'Nicht gefunden' })
      return
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' })
  }
})

app.post('/api/courses', async (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Body muss ein JSON-Objekt sein' })
      return
    }
    const course = body.course
    const tasks = body.tasks
    if (!course || typeof course !== 'object') {
      res.status(400).json({ error: '"course" fehlt oder ist kein Objekt' })
      return
    }
    if (!Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: '"tasks" muss ein nicht-leeres Array sein' })
      return
    }
    await ensureDataDir()
    const id = generateId()
    const filePath = path.join(DATA_DIR, `${id}.json`)
    const payload = { ...body, _savedAt: Date.now() }
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
    res.status(201).json({ id })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' })
  }
})

app.delete('/api/courses/:id', async (req, res) => {
  const filePath = safeIdPath(req.params.id)
  if (!filePath) {
    res.status(400).json({ error: 'Ungültige ID' })
    return
  }
  try {
    await fs.unlink(filePath)
    res.json({ ok: true })
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.status(404).json({ error: 'Nicht gefunden' })
      return
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' })
  }
})

ensureDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`[regex-study] Backend läuft auf http://localhost:${PORT}`)
    console.log(`[regex-study] Daten: ${DATA_DIR}`)
  })
}).catch((err) => {
  console.error('[regex-study] Start fehlgeschlagen:', err)
  process.exit(1)
})
