const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export function getAuthToken() {
  return window.localStorage.getItem('machinex-auth-token')
}

export function getStoredUser() {
  try {
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
