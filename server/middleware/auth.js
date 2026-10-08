const jwt = require('jsonwebtoken')
const User = require('../models/User')

function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return secret
}

function signUser(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, jwtSecret(), { expiresIn: '7d' })
}

async function requireAuth(request, response, next) {
  try {
    const header = request.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : request.query.token
    if (!token) return response.status(401).json({ error: 'Authentication required' })
    const claims = jwt.verify(token, jwtSecret())
    const user = await User.findById(claims.sub).select('+passwordHash').lean()
    if (!user) return response.status(401).json({ error: 'User account not found' })
    request.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return response.status(401).json({ error: 'Authentication token is invalid or expired' })
    }
    next(error)
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') return response.status(403).json({ error: 'Administrator access required' })
  next()
}

module.exports = { jwtSecret, signUser, requireAuth, requireAdmin }
