import { cookies } from 'next/headers'
import { sealData, unsealData } from 'iron-session'
import type { UserRole } from './types'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: UserRole
  accessToken?: string
}

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'publicwatch-default-secret-min-32-characters!'
const COOKIE_NAME = 'publicwatch_session'

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookie = cookies().get(COOKIE_NAME)
  if (!cookie?.value) return null
  try {
    const user = await unsealData<SessionUser>(cookie.value, {
      password: SESSION_SECRET,
    })
    return user
  } catch {
    return null
  }
}

export async function setSessionUser(user: SessionUser) {
  const sealed = await sealData(user, { password: SESSION_SECRET })
  cookies().set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSessionUser() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}


export function requireAuth(): Promise<SessionUser> {
  return getSessionUser().then((user) => {
    if (!user) throw new Error('Unauthorized')
    return user
  })
}
