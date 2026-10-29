import { describe, it, expect } from 'vitest'
import { loginErrorMessage } from '@/lib/auth/messages'
describe('smoke', () => {
  it('runs vitest', () => { expect(1 + 1).toBe(2) })
  it('maps auth failures to the Italian login error', () => {
    expect(loginErrorMessage('Invalid login credentials')).toBe('Email o password non corretti.')
  })
})
