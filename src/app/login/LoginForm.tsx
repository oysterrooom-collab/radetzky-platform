'use client'
import { useActionState } from 'react'
import { login } from './actions'
export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium" htmlFor="email">Email
        <input id="email" name="email" type="email" autoComplete="username" required className="rounded border border-ink/20 bg-white px-3 py-3 text-base" />
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete="current-password" required className="rounded border border-ink/20 bg-white px-3 py-3 text-base" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-vinaccia">{state.error}</p>}
      <button disabled={pending} className="rounded bg-iron px-4 py-3 font-semibold text-linen disabled:opacity-60">{pending ? 'Accesso in corso…' : 'Accedi'}</button>
    </form>
  )
}
