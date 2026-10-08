import { useCallback, useEffect, useRef, useState } from 'react'
import { CarFront, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { apiBase, saveSession } from '../auth'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', identifier: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleCredential, setGoogleCredential] = useState('')
  const [googlePhone, setGooglePhone] = useState('')
  const [googleNeedsPhone, setGoogleNeedsPhone] = useState(false)
  const googleButton = useRef(null)

  const completeAuth = useCallback((payload) => {
    saveSession(payload)
    onAuthenticated(payload.user)
  }, [onAuthenticated])

  const finishGoogleAuth = useCallback(async (credential, phone = '') => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, phone }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (payload.needsPhone) {
          setGoogleCredential(credential)
          setGoogleNeedsPhone(true)
          return
        }
        throw new Error(payload.error || 'Google sign-in failed')
      }
      completeAuth(payload)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setBusy(false)
    }
  }, [completeAuth])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || !googleButton.current) return undefined
    let initialized = false
    const render = () => {
      if (!window.google || !googleButton.current) return
      if (!initialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => finishGoogleAuth(credential),
        })
        initialized = true
      }
      googleButton.current.replaceChildren()
      const width = Math.max(200, Math.min(400, googleButton.current.clientWidth || 320))
      window.google.accounts.id.renderButton(googleButton.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width,
      })
    }
    const observer = new ResizeObserver(() => {
      if (initialized) render()
    })
    if (window.google) {
      render()
      observer.observe(googleButton.current)
      return () => observer.disconnect()
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = render
    document.head.appendChild(script)
    script.addEventListener('load', () => observer.observe(googleButton.current))
    return () => {
      observer.disconnect()
      script.remove()
    }
  }, [finishGoogleAuth])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { identifier: form.identifier, password: form.password }
        : form
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Authentication failed')
      completeAuth(payload)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><CarFront size={28} /><strong>MachineX</strong></div>
        <p className="eyebrow">Secure inspection workspace</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">{mode === 'login' ? 'Sign in to view your inspection history.' : 'Your diagnostic reports will be stored under your account.'}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" />}
          {mode === 'login'
            ? <input required value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder="Email or mobile number" />
            : <>
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" />
              <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Mobile number" />
            </>}
          <label className="auth-password"><input required type={showPassword ? 'text' : 'password'} minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password (8+ characters)" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></label>
          {mode === 'signup' && <input required type={showPassword ? 'text' : 'password'} minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Confirm password" />}
          {error && <div className="auth-error">{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="auth-divider"><span>or continue with</span></div>
        <div ref={googleButton} className="google-button" />
        {googleNeedsPhone && <div className="google-phone-panel"><ShieldCheck size={18} /><div><strong>One more detail</strong><small>Enter your mobile number to finish creating your MachineX account.</small></div><input value={googlePhone} onChange={(event) => setGooglePhone(event.target.value)} placeholder="+91 9876543210" inputMode="tel" /><button type="button" className="primary-button" onClick={() => finishGoogleAuth(googleCredential, googlePhone)} disabled={busy || !googlePhone.trim()}>{busy ? 'Verifying...' : 'Continue'}</button></div>}
        {!import.meta.env.VITE_GOOGLE_CLIENT_ID && <small className="muted">Google sign-in is not configured in the client environment.</small>}
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  )
}
