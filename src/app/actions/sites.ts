'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { parseDish, parseInfo, sortForSection, type Site } from '@/lib/sites/schemas'
type R = { ok: true } | { ok: false; error: string }
const DENIED = 'Salvataggio non riuscito: non hai i permessi per questo sito.'
const done = (): R => { revalidatePath('/sito'); return { ok: true } }

/** Nuovo piatto: va in fondo alla sua sezione. */
export async function saveDish(id: string | null, raw: unknown): Promise<R> {
  const p = parseDish(raw); if (!p.ok) return p
  const s = await createServerClient()
  const { data: rows } = await s.from('site_menu').select('id, section, sort').eq('site', p.data.site)
  const cur = rows?.find((r) => r.id === id)
  if (id && !cur) return { ok: false, error: DENIED }
  // nuovo piatto o cambio di sezione: in fondo alla sezione di arrivo, senza spostare le sezioni
  const sort = cur && cur.section === p.data.section ? cur.sort : sortForSection((rows ?? []).filter((r) => r.id !== id), p.data.section)
  const { data, error } = id ? await s.from('site_menu').update({ ...p.data, sort }).eq('id', id).select('id') : await s.from('site_menu').insert({ ...p.data, sort }).select('id')
  if (error || !data?.length) return { ok: false, error: DENIED }
  if (!cur || cur.section !== p.data.section) await renumber(s, p.data.site)
  return done()
}
/** Rinumera 10, 20, 30… tenendo l'ordine attuale delle sezioni e dei piatti. */
async function renumber(s: Awaited<ReturnType<typeof createServerClient>>, site: Site) {
  const { data: rows } = await s.from('site_menu').select('id, section, sort').eq('site', site).order('sort').order('name')
  if (!rows) return
  const sections = [...new Set(rows.map((r) => r.section))]
  const ordered = sections.flatMap((sec) => rows.filter((r) => r.section === sec))
  for (const [k, r] of ordered.entries()) if (r.sort !== (k + 1) * 10) await s.from('site_menu').update({ sort: (k + 1) * 10 }).eq('id', r.id)
}
export async function deleteDish(id: string): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from('site_menu').delete().eq('id', id).select('id')
  return data?.length ? done() : { ok: false, error: DENIED }
}
export async function setVisible(id: string, visible: boolean): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from('site_menu').update({ visible }).eq('id', id).select('id')
  return data?.length ? done() : { ok: false, error: DENIED }
}
/** Sposta un piatto di una posizione nella sua sezione, oppure un'intera sezione rispetto alle altre. Rinumera 10, 20, 30… */
export async function move(site: Site, target: { id?: string; section?: string }, dir: -1 | 1): Promise<R> {
  const s = await createServerClient()
  const { data: rows } = await s.from('site_menu').select('id, section, sort').eq('site', site).order('sort').order('name')
  if (!rows?.length) return { ok: false, error: DENIED }
  const sections = [...new Set(rows.map((r) => r.section))]
  let ordered: typeof rows
  if (target.section !== undefined) {
    const i = sections.indexOf(target.section), j = i + dir
    if (i < 0 || j < 0 || j >= sections.length) return { ok: true }
    ;[sections[i], sections[j]] = [sections[j], sections[i]]
    ordered = sections.flatMap((sec) => rows.filter((r) => r.section === sec))
  } else {
    const r = rows.find((x) => x.id === target.id); if (!r) return { ok: false, error: DENIED }
    const inSec = rows.filter((x) => x.section === r.section), i = inSec.indexOf(r), j = i + dir
    if (j < 0 || j >= inSec.length) return { ok: true }
    ;[inSec[i], inSec[j]] = [inSec[j], inSec[i]]
    ordered = sections.flatMap((sec) => (sec === r.section ? inSec : rows.filter((x) => x.section === sec)))
  }
  const changes = ordered.map((x, k) => ({ id: x.id, sort: (k + 1) * 10 })).filter((x, k) => ordered[k].sort !== x.sort)
  for (const c of changes) {
    const { error } = await s.from('site_menu').update({ sort: c.sort }).eq('id', c.id)
    if (error) return { ok: false, error: DENIED }
  }
  return done()
}
export async function renameSection(site: Site, from: string, to: string): Promise<R> {
  const name = to.trim(); if (!name) return { ok: false, error: 'Scrivi il nome della sezione.' }
  if (name.length > 60) return { ok: false, error: 'Nome troppo lungo.' }
  const s = await createServerClient()
  const { data } = await s.from('site_menu').update({ section: name }).eq('site', site).eq('section', from).select('id')
  return data?.length ? done() : { ok: false, error: DENIED }
}
export async function saveInfo(raw: Record<string, unknown>): Promise<R> {
  const p = parseInfo(raw); if (!p.ok) return p
  const s = await createServerClient()
  for (const [key, value] of Object.entries(p.data)) {
    const { data, error } = await s.from('site_info').update({ value }).eq('key', key).select('key')
    if (error || !data?.length) return { ok: false, error: DENIED }
  }
  return done()
}
