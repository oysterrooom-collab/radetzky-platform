/** Traduce gli errori di Supabase Auth in messaggi per l'utente. */
export function loginErrorMessage(raw: string | undefined | null): string {
  if (!raw) return 'Accesso non riuscito. Riprova.'
  if (/invalid login credentials/i.test(raw)) return 'Email o password non corretti.'
  if (/email not confirmed/i.test(raw)) return 'Account non ancora attivo. Chiedi all’amministratore.'
  return 'Accesso non riuscito. Riprova tra qualche minuto.'
}
