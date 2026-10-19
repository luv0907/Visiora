import { describe, it, expect } from 'vitest'
import { greetingName } from './greetingName'

const guest = { displayName: 'Physics Scholar', provider: 'scholar.visiora' }

describe('greetingName', () => {
  it('hides the guest placeholder name', () => {
    expect(greetingName({ name: 'Scholar' }, guest)).toBe('')
    expect(greetingName(null, { displayName: 'Research Scholar', provider: 'scholar.visiora' })).toBe('')
  })

  it('uses a name the guest typed into their profile', () => {
    expect(greetingName({ name: 'Ananya Rao' }, guest)).toBe('Ananya')
  })

  it('uses the signed-in account name', () => {
    expect(greetingName({ name: 'Scholar' }, { displayName: 'Akshay Kumar', provider: 'google.com' })).toBe('Akshay')
  })

  it('ignores placeholder names from any source', () => {
    expect(greetingName({ name: 'Physics Scholar' }, { displayName: 'Scholar' })).toBe('')
    expect(greetingName(undefined, undefined)).toBe('')
  })
})
