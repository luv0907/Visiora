// First name for the Home greeting, or '' when we don't know a real one.
// Guest ("instant access") accounts and default profiles carry placeholder
// names like "Physics Scholar", which must not be read as the student's name.
const GUEST_PROVIDER = 'scholar.visiora'
const PLACEHOLDER = /^(scholar|physics scholar|research scholar|research fellow|explorer)$/i

const realName = name => {
  const n = String(name || '').trim()
  return n && !PLACEHOLDER.test(n) ? n : ''
}

export function greetingName(profile, user) {
  const fromProfile = realName(profile?.name)
  const fromAccount = user?.provider === GUEST_PROVIDER ? '' : realName(user?.displayName)
  return (fromProfile || fromAccount).split(/\s+/)[0] || ''
}
