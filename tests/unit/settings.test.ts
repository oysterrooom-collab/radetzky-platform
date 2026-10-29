import { describe, it, expect } from 'vitest'
import { parseCompany, parseQuoteSettings } from '@/lib/catalog/settings'
describe('impostazioni azienda e preventivo', () => {
  it('azienda: ragione sociale e P.IVA obbligatorie, P.IVA a 11 cifre', () => {
    expect(parseCompany({ legal_name: 'Radetzky Srl', vat_number: 'IT 12345678901', address: 'Corso Garibaldi 105', phone: '', email: '' })).toMatchObject({ ok: true, data: { vat_number: '12345678901' } })
    expect(parseCompany({ legal_name: '', vat_number: '12345678901' }).ok).toBe(false)
    expect(parseCompany({ legal_name: 'X', vat_number: '123' }).ok).toBe(false)
    expect(parseCompany({ legal_name: 'X', vat_number: '12345678901', email: 'no' }).ok).toBe(false)
  })
  it('preventivo: validità 1–90 giorni, acconto 0–100%', () => {
    expect(parseQuoteSettings({ validity_days: '15', deposit_pct: '30', balance_days_after: '7', conditions: 'Testo' })).toMatchObject({ ok: true, data: { validity_days: 15, deposit_pct: 30 } })
    expect(parseQuoteSettings({ validity_days: '0', deposit_pct: '30', balance_days_after: '7', conditions: '' }).ok).toBe(false)
    expect(parseQuoteSettings({ validity_days: '15', deposit_pct: '130', balance_days_after: '7', conditions: '' }).ok).toBe(false)
  })
})
it('i segnaposto del seed non bastano per emettere un preventivo', () => {
  expect(parseCompany({ legal_name: '[Ragione sociale]', vat_number: '[Partita IVA]', address: '', phone: '', email: '' }).ok).toBe(false)
})
