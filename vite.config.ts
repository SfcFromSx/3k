import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PROJECT_ROOT = fileURLToPath(new URL('.', import.meta.url))
const SKILL_HISTORY_DIR = path.join(PROJECT_ROOT, 'data', 'skill-history')

type SkillVersionRecord = {
  version: number
  round: number
  updatedAt: string
  source: 'seed' | 'round_review'
  content: string
  summary: string
}

type SkillHistorySnapshot = {
  playerId: 'A' | 'B' | 'C'
  currentSkill: string
  history: SkillVersionRecord[]
}

const readJsonBody = async (req: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const isSkillVersionRecord = (value: unknown): value is SkillVersionRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'number' &&
    typeof record.round === 'number' &&
    typeof record.updatedAt === 'string' &&
    (record.source === 'seed' || record.source === 'round_review') &&
    typeof record.content === 'string' &&
    typeof record.summary === 'string'
  )
}

const isSkillHistorySnapshot = (value: unknown): value is SkillHistorySnapshot => {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Record<string, unknown>
  return (
    (snapshot.playerId === 'A' || snapshot.playerId === 'B' || snapshot.playerId === 'C') &&
    typeof snapshot.currentSkill === 'string' &&
    Array.isArray(snapshot.history) &&
    snapshot.history.every(isSkillVersionRecord)
  )
}

const formatSkillMarkdown = (playerId: string, record: SkillVersionRecord) => `# Player ${playerId} Skill Version ${record.version}

- Round: ${record.round}
- Source: ${record.source}
- Updated At: ${record.updatedAt}
- Summary: ${record.summary}

## Content

${record.content}
`

const writeSkillHistorySnapshot = async (snapshot: SkillHistorySnapshot) => {
  const playerDir = path.join(SKILL_HISTORY_DIR, `player-${snapshot.playerId.toLowerCase()}`)
  await fs.mkdir(playerDir, { recursive: true })

  await Promise.all([
    fs.writeFile(
      path.join(playerDir, 'history.json'),
      JSON.stringify(snapshot, null, 2),
      'utf8'
    ),
    fs.writeFile(path.join(playerDir, 'current.md'), snapshot.currentSkill || '', 'utf8'),
    ...snapshot.history.map((record) =>
      fs.writeFile(
        path.join(
          playerDir,
          `v${String(record.version).padStart(3, '0')}-round-${String(record.round).padStart(3, '0')}-${record.source}.md`
        ),
        formatSkillMarkdown(snapshot.playerId, record),
        'utf8'
      )
    ),
  ])
}

const skillHistoryPersistencePlugin = (): Plugin => ({
  name: 'skill-history-persistence',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const requestPath = req.url?.split('?')[0]
      if (req.method !== 'POST' || requestPath !== '/api/skill-history/snapshot') {
        next()
        return
      }

      try {
        const payload = await readJsonBody(req)
        if (!isSkillHistorySnapshot(payload)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid skill history payload.' }))
          return
        }

        await writeSkillHistorySnapshot(payload)
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      } catch (error) {
        console.error('Failed to persist skill history snapshot.', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Failed to persist skill history snapshot.' }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), skillHistoryPersistencePlugin()],
  server: {
    proxy: {
      '/api/ark': {
        target: 'https://ark.cn-beijing.volces.com/api/coding/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ark/, ''),
      },
    },
  },
})
