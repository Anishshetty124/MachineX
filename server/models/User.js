const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, unique: true, trim: true, index: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, index: true },
  role: { type: String, enum: ['operator', 'quality_manager', 'admin'], default: 'operator' },
  plant: { type: String, trim: true },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
