const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User')
const { signUser, requireAuth } = require('../middleware/auth')

const googleClient = new OAuth2Client()

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '')
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, plant: user.plant }
}

function validateCredentials({ email, phone, password }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) return 'A valid email address is required'
  if (!/^\+?\d{10,15}$/.test(normalizePhone(phone))) return 'A valid mobile number is required'
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters'
  return null
}

router.post('/register', async (request, response, next) => {
  try {
    const { name, email, phone, password, confirmPassword } = request.body || {}
    const validationError = validateCredentials({ email, phone, password })
    if (validationError) return response.status(400).json({ error: validationError })
    if (password !== confirmPassword) return response.status(400).json({ error: 'Passwords do not match' })

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = normalizePhone(phone)
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] })
    if (existing) return response.status(409).json({ error: 'An account already exists with that email or mobile number' })

    const user = await User.create({
      name: String(name || '').trim() || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: await bcrypt.hash(password, 12),
      role: process.env.ADMIN_EMAIL?.toLowerCase() === normalizedEmail ? 'admin' : 'operator',
    })
    response.status(201).json({ token: signUser(user), user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (request, response, next) => {
  try {
    const { identifier, password } = request.body || {}
    if (!identifier || !password) return response.status(400).json({ error: 'Email/mobile number and password are required' })
    const normalizedIdentifier = String(identifier).trim().toLowerCase()
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { phone: normalizePhone(identifier) }],
    }).select('+passwordHash')
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: 'Invalid credentials' })
    }
    response.json({ token: signUser(user), user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.post('/google', async (request, response, next) => {
  try {
    const { credential, phone } = request.body || {}
    if (!credential) return response.status(400).json({ error: 'Google credential is required' })
    if (!process.env.GOOGLE_CLIENT_ID) return response.status(503).json({ error: 'Google sign-in is not configured on the server' })
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || !payload.email_verified) return response.status(400).json({ error: 'Google account email is not verified' })

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] })
    if (!user) {
      const normalizedPhone = normalizePhone(phone)
      if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
        return response.status(422).json({ error: 'Enter your mobile number to finish Google sign-up', needsPhone: true })
      }
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        phone: normalizedPhone,
        googleId: payload.sub,
        role: process.env.ADMIN_EMAIL?.toLowerCase() === payload.email.toLowerCase() ? 'admin' : 'operator',
      })
    } else if (!user.googleId) {
      user.googleId = payload.sub
      await user.save()
    }
    response.json({ token: signUser(user), user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user) }))

module.exports = router
