const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function tokenExpiry(token) {
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function getAuthToken() {
  const token = window.localStorage.getItem('machinex-auth-token')
  const expiresAt = token ? tokenExpiry(token) : null
  if (expiresAt && expiresAt <= Date.now()) {
    clearSession()
    return null
  }
  return token
}

export function getSessionExpiry() {
  const token = window.localStorage.getItem('machinex-auth-token')
  return token ? tokenExpiry(token) : null
}

export function getStoredUser() {
  try {
    if (!getAuthToken()) return null
    return JSON.parse(window.localStorage.getItem('machinex-auth-user') || 'null')
  } catch {
    return null
  }
}

export function saveSession(payload) {
  window.localStorage.setItem('machinex-auth-token', payload.token)
  window.localStorage.setItem('machinex-auth-user', JSON.stringify(payload.user))
}

export function clearSession() {
  window.localStorage.removeItem('machinex-auth-token')
  window.localStorage.removeItem('machinex-auth-user')
}

export async function authFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${apiBase}${path}`, { ...options, headers })
}

export { apiBase }
