import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (<header className="mb-6 flex flex-wrap items-end justify-between gap-3"><h1 className="text-3xl font-extrabold tracking-tight [font-stretch:80%]">{title}</h1>{children && <div className="flex flex-wrap gap-2">{children}</div>}</header>)
}
export function Button({ variant = 'primary', className, ...p }: ComponentProps<'button'> & { variant?: 'primary' | 'line' | 'danger' }) {
  return <button {...p} className={cx('inline-flex min-h-11 items-center justify-center rounded px-4 font-semibold transition disabled:opacity-50',
    variant === 'primary' && 'bg-iron text-linen hover:bg-vinaccia', variant === 'line' && 'border-2 border-iron text-iron hover:bg-iron hover:text-linen',
    variant === 'danger' && 'border-2 border-divano text-divano hover:bg-divano hover:text-linen', className)} />
}
export function LinkButton({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'line' }) {
  return <Link href={href} className={cx('inline-flex min-h-11 items-center rounded px-4 font-semibold', variant === 'primary' ? 'bg-iron text-linen hover:bg-vinaccia' : 'border-2 border-iron text-iron hover:bg-iron hover:text-linen')}>{children}</Link>
}
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (<div className="grid gap-1"><label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>{children}
    {hint && !error && <p className="text-sm text-grey">{hint}</p>}{error && <p role="alert" className="text-sm font-medium text-divano">{error}</p>}</div>)
}
export const inputCls = 'min-h-11 w-full rounded border border-ink/20 bg-white px-3 text-base'
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded border border-ink/10 bg-white p-5', className)}>{children}</section>
}
export function Empty({ children }: { children: ReactNode }) { return <p className="rounded border border-dashed border-ink/20 p-6 text-grey">{children}</p> }
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'brand' }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
    tone === 'neutral' && 'bg-stone text-ink', tone === 'ok' && 'bg-ok/15 text-ok', tone === 'warn' && 'bg-warn/15 text-warn', tone === 'bad' && 'bg-divano/10 text-divano', tone === 'brand' && 'bg-vinaccia/10 text-vinaccia')}>{children}</span>
}
