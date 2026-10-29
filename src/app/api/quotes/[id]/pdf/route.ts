import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderQuotePdf } from '@/lib/pdf/render'
import type { QuoteSnapshot } from '@/lib/quote/snapshot'
/** Scarica il PDF archiviato. Il controllo d'accesso è la RLS su `quotes`: chi non vede i costi non trova la riga. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await createServerClient()
  const { data: q } = await s.from('quotes').select('number, version, snapshot, pdf_path').eq('id', id).maybeSingle()
  if (!q) return new NextResponse('Preventivo non trovato', { status: 404 })
  let body: Buffer | null = null
  if (q.pdf_path) { const { data } = await createAdminClient().storage.from('quotes').download(q.pdf_path); if (data) body = Buffer.from(await data.arrayBuffer()) }
  if (!body) body = await renderQuotePdf(q.snapshot as QuoteSnapshot)   // archivio non disponibile: rigenerato dalla stessa istantanea
  return new NextResponse(new Uint8Array(body), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Preventivo-${q.number}-v${q.version}.pdf"`, 'Cache-Control': 'private, no-store' } })
}
