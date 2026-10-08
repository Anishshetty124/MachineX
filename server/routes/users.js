const router = require('express').Router()
const User = require('../models/User')

router.get('/', async (_request, response, next) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 }).lean()
    response.json({ data: users })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (request, response, next) => {
  try {
    const user = await User.create(request.body)
    response.status(201).json({ data: user })
  } catch (error) {
    next(error)
  }
})

module.exports = router
