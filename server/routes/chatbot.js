const router = require('express').Router()

router.post('/', (request, response) => response.json({ reply: 'AI assistant route ready', context: request.body?.context || null }))

module.exports = router
