const router = require('express').Router()
const Inspection = require('../models/Inspection')

router.get('/', async (request, response, next) => {
	try {
		const filter = request.query.status ? { status: request.query.status } : {}
		const inspections = await Inspection.find(filter).sort({ createdAt: -1 }).limit(100).lean()
		response.json({ data: inspections })
	} catch (error) {
		next(error)
	}
})

router.post('/', async (request, response, next) => {
	try {
		const inspection = await Inspection.create(request.body)
		response.status(201).json({ data: inspection })
	} catch (error) {
		next(error)
	}
})

module.exports = router
