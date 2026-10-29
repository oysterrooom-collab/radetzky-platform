'use client'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { changeOwnPassword } from '@/app/actions/users'
export default function ChangePassword() {
  const [state, action, pending] = useActionState(changeOwnPassword, undefined)
  const router = useRouter()
  useEffect(() => { if (state?.ok) router.replace('/') }, [state, router])
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-5">
      <h1 className="text-2xl font-extrabold">Scegli la tua password</h1>
      <p className="text-grey">Stai usando una password provvisoria. Scegline una tua, di almeno 10 caratteri.</p>
      <form action={action} className="grid gap-4">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="password">Nuova password
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="min-h-11 rounded border border-ink/20 bg-white px-3 text-base" /></label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="password2">Ripeti la password
          <input id="password2" name="password2" type="password" autoComplete="new-password" minLength={10} required className="min-h-11 rounded border border-ink/20 bg-white px-3 text-base" /></label>
        {state?.error && <p role="alert" className="text-sm font-medium text-divano">{state.error}</p>}
        <button disabled={pending} className="min-h-11 rounded bg-iron font-semibold text-linen">{pending ? 'Salvataggio…' : 'Salva la password'}</button>
      </form>
    </main>
  )
}
