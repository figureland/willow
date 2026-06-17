import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SESSION_COOKIE = 'willow_session'

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url')

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [k, ...rest] = part.trim().split('=')
      return [k, decodeURIComponent(rest.join('='))]
    }),
  )
}

const handler = (req: VercelRequest, res: VercelResponse) => {
  const secret = process.env.WILLOW_SESSION_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE]
  if (!token) return res.status(200).json({ authenticated: false })

  const lastDot = token.lastIndexOf('.')
  if (lastDot < 0) return res.status(200).json({ authenticated: false })

  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  const expected = sign(payload, secret)
  if (!safeEqual(signature, expected)) {
    return res.status(200).json({ authenticated: false })
  }

  const [, expiresRaw] = payload.split('.')
  const expires = Number(expiresRaw)
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) {
    return res.status(200).json({ authenticated: false })
  }

  return res.status(200).json({ authenticated: true, expiresAt: expires })
}

export default handler
