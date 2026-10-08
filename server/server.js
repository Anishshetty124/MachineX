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

// Robust CORS origins parser (handles localhost + 127.0.0.1 and trims whitespace)
const rawUrls = process.env.CLIENT_URLS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000'
const allowedOrigins = rawUrls.split(',').map((url) => url.trim())

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  },
})

const port = Number(process.env.PORT || 5000)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(null, true) // Lenient during hackathon demo mode
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health Check Route
app.get('/api/health', (_request, response) =>
  response.json({
    status: 'ok',
    service: 'auto-qual-api',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'offline',
  })
)

// API Route Handlers
app.use('/api/inspections', require('./routes/inspections'))
app.use('/api/models', require('./routes/models'))
app.use('/api/users', require('./routes/users'))
app.use('/api/telemetry', require('./routes/telemetry'))
app.use('/api/chatbot', require('./routes/chatbot'))

// Global Error Handling Middleware
app.use((error, _request, response, _next) => {
  console.error('[server error]', error)
  const status = error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500
  response.status(status).json({
    error: process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : error.message || 'An unknown error occurred',
  })
})

// Socket.io Real-Time Channel
io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`)
  socket.emit('system:ready', { message: 'Telemetry channel connected' })
  
  socket.on('telemetry:subscribe', () => {
    socket.join('telemetry')
    console.log(`[socket] ${socket.id} joined 'telemetry' room`)
  })

  socket.on('disconnect', () => {
    console.log(`[socket] Client disconnected: ${socket.id}`)
  })
})

// Database Connection & Server Startup
async function start() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/auto-qual'
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    console.log('[db] MongoDB connected successfully')
  } catch (error) {
    console.warn('[db] MongoDB connection failed:', error.message)
    console.warn('[db] Running API in fallback in-memory mode')
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[server] AUTO-QUAL API listening on http://localhost:${port}`)
  })
}

start()

module.exports = { app, io, httpServer }