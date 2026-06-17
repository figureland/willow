import type { IncomingMessage, ServerResponse } from 'node:http'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadEnv, type Plugin } from 'vite'

type Handler = (req: VercelRequest, res: VercelResponse) => unknown

const ROUTES: Record<string, () => Promise<{ default: Handler }>> = {
  '/api/verify-passcode': () => import('../api/verify-passcode'),
  '/api/session': () => import('../api/session'),
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [k, ...rest] = part.trim().split('=')
      return [k, decodeURIComponent(rest.join('='))]
    }),
  )
}

const augmentRes = (res: ServerResponse) => {
  const r = res as ServerResponse & {
    status: (code: number) => typeof r
    json: (data: unknown) => typeof r
    send: (data: unknown) => typeof r
  }
  r.status = (code: number) => {
    r.statusCode = code
    return r
  }
  r.json = (data: unknown) => {
    if (!r.getHeader('content-type')) {
      r.setHeader('content-type', 'application/json')
    }
    r.end(JSON.stringify(data))
    return r
  }
  r.send = (data: unknown) => {
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
      r.end(data)
    } else {
      r.json(data)
    }
    return r
  }
  return r
}

export const apiPlugin = (): Plugin => ({
  name: 'willow-api',
  configureServer(server) {
    const env = loadEnv(
      server.config.mode,
      server.config.envDir ?? process.cwd(),
      '',
    )
    for (const [key, value] of Object.entries(env)) {
      if (process.env[key] === undefined) process.env[key] = value
    }

    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0]
      if (!url || !ROUTES[url]) return next()

      try {
        const mod = await ROUTES[url]()
        const raw = await readBody(req)
        const vReq = req as IncomingMessage & {
          body: unknown
          cookies: Record<string, string>
          query: Record<string, string | string[]>
        }
        vReq.body = raw
        vReq.cookies = parseCookies(req.headers.cookie)
        vReq.query = {}

        await mod.default(
          vReq as VercelRequest,
          augmentRes(res) as VercelResponse,
        )
      } catch (err) {
        console.error('[api]', err)
        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'internal_error' }))
        }
      }
    })
  },
})
