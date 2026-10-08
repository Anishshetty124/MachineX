const router = require('express').Router()

router.get('/', (_request, response) => response.json({ data: [], message: 'Telemetry route ready' }))

module.exports = router
