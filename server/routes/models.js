const router = require('express').Router()
const PartModel = require('../models/PartModel')

router.get('/', async (request, response, next) => {
  try {
    const filter = request.query.partType ? { partType: request.query.partType } : {}
    const models = await PartModel.find({ ...filter, active: true }).sort({ createdAt: -1 }).lean()
    response.json({ data: models })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (request, response, next) => {
  try {
    const model = await PartModel.create(request.body)
    response.status(201).json({ data: model })
  } catch (error) {
    next(error)
  }
})

module.exports = router
