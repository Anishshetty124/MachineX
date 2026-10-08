const router = require('express').Router()
const User = require('../models/User')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.get('/', requireAuth, requireAdmin, async (_request, response, next) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 }).lean()
    response.json({ data: users })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/role', requireAuth, requireAdmin, async (request, response, next) => {
  try {
    if (!['operator', 'quality_manager', 'admin'].includes(request.body?.role)) {
      return response.status(400).json({ error: 'Invalid role' })
    }
    const user = await User.findByIdAndUpdate(request.params.id, { role: request.body.role }, { new: true }).lean()
    if (!user) return response.status(404).json({ error: 'User not found' })
    response.json({ data: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, plant: user.plant } })
  } catch (error) {
    next(error)
  }
})

module.exports = router
