const path = require('node:path')
const http = require('node:http')
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const { Server } = require('socket.io')

// Load both workspace-root and service-local environment files when present.
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '.env') })

const app = express()
const httpServer = http.createServer(app)
const allowedOrigins = (process.env.CLIENT_URLS || 'http://localhost:5173,http://localhost:5000').split(',')
const io = new Server(httpServer, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'] } })
const port = Number(process.env.PORT || 5000)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_request, response) => response.json({ status: 'ok', service: 'auto-qual-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'offline' }))
app.use('/api/inspections', require('./routes/inspections'))
app.use('/api/models', require('./routes/models'))
app.use('/api/users', require('./routes/users'))
app.use('/api/telemetry', require('./routes/telemetry'))
app.use('/api/chatbot', require('./routes/chatbot'))

app.use((error, _request, response, _next) => {
  console.error(error)
  const status = error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500
  response.status(status).json({ error: process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : error.message })
})

io.on('connection', (socket) => {
  socket.emit('system:ready', { message: 'Telemetry channel connected' })
  socket.on('telemetry:subscribe', () => socket.join('telemetry'))
})

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      console.log('MongoDB connected')
    } catch (error) {
      console.error('MongoDB connection failed:', error.message)
    }
  } else {
    console.warn('MONGODB_URI is not configured; starting without database')
  }

  httpServer.listen(port, () => console.log(`AUTO-QUAL API listening on http://localhost:${port}`))
}

start()

module.exports = { app, io, httpServer }
