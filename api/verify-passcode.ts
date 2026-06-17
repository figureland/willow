import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SESSION_COOKIE = 'willow_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url')

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

const safeParse = (raw: string): Record<string, unknown> => {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const expected = process.env.WILLOW_PASSCODE
  const secret = process.env.WILLOW_SESSION_SECRET

  if (!expected || !secret) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  const body =
    typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {})
  const passcode =
    typeof body?.passcode === 'string' ? body.passcode.trim() : ''

  if (!/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ error: 'invalid_format' })
  }

  if (!safeEqual(passcode, expected)) {
    return res.status(401).json({ error: 'invalid_passcode' })
  }

  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `v1.${expires}`
  const signature = sign(payload, secret)
  const token = `${payload}.${signature}`

  const isProd = process.env.VERCEL_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ]
      .filter(Boolean)
      .join('; '),
  )

  return res.status(200).json({ ok: true, expiresAt: expires })
}

export default handler
