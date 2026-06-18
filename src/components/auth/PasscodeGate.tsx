import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Button, PasscodeInput } from '../ui'

type Status = 'checking' | 'locked' | 'verifying' | 'unlocked'

type PasscodeGateProps = {
  children: ReactNode
}

export const PasscodeGate = ({ children }: PasscodeGateProps) => {
  const [status, setStatus] = useState<Status>('checking')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/session', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (cancelled) return
        setStatus(data?.authenticated ? 'unlocked' : 'locked')
      })
      .catch(() => {
        if (!cancelled) setStatus('locked')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = useCallback(async (passcode: string) => {
    setStatus('verifying')
    setError(null)
    try {
      const res = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ passcode }),
      })
      if (res.ok) {
        setStatus('unlocked')
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(
        data?.error === 'invalid_passcode'
          ? 'Incorrect passcode. Try again.'
          : 'Something went wrong. Try again.',
      )
      setValue('')
      setStatus('locked')
    } catch {
      setError('Network error. Try again.')
      setStatus('locked')
    }
  }, [])

  if (status === 'unlocked') return <>{children}</>

  return (
    <div className="min-h-full grid place-items-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Willow
          </h1>
          <p className="text-sm text-text-secondary">
            Enter your six-digit passcode to continue.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (value.length === 6) submit(value)
          }}
          className="flex flex-col gap-6"
        >
          <PasscodeInput
            value={value}
            onChange={(next) => {
              setValue(next)
              if (error) setError(null)
            }}
            onComplete={submit}
            disabled={status === 'verifying' || status === 'checking'}
            invalid={!!error}
            errorMessage={error ?? undefined}
            label="Passcode"
          />

          <Button
            type="submit"
            size="lg"
            loading={status === 'verifying'}
            disabled={value.length !== 6 || status === 'checking'}
          >
            {status === 'verifying' ? 'Verifying…' : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  )
}
