'use client'
/** Interruttore grande, leggibile anche da telefono. */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (<button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
    className="inline-flex min-h-11 items-center gap-2 rounded px-1 disabled:opacity-50">
    <span className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-ok' : 'bg-ink/25'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} /></span>
    <span className={`hidden w-20 text-left text-sm font-semibold sm:inline ${on ? 'text-ok' : 'text-grey'}`}>{on ? 'Sul sito' : 'Nascosto'}</span>
  </button>)
}
/** Messaggio di conferma che sparisce da solo. */
export function Toast({ msg }: { msg: { ok: boolean; t: string } | null }) {
  if (!msg) return null
  return <p role={msg.ok ? 'status' : 'alert'} className={`fixed inset-x-4 top-16 z-30 mx-auto max-w-md rounded px-4 py-3 text-center font-semibold shadow-lg ${msg.ok ? 'bg-iron text-linen' : 'bg-divano text-linen'}`}>{msg.t}</p>
}
export const SAVED = 'Salvato ✓  Sul sito entro un minuto.'
