import { renderToBuffer } from '@react-pdf/renderer'
import type { QuoteSnapshot } from '@/lib/quote/snapshot'
import { QuoteDocument } from './QuoteDocument'
/** PDF del preventivo generato SOLO dall'istantanea: stesso input, stessi byte. */
export async function renderQuotePdf(q: QuoteSnapshot): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument q={q} />)
}
