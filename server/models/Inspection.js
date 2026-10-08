const mongoose = require('mongoose')

const inspectionSchema = new mongoose.Schema({
  part: { type: String, required: true, trim: true },
  defectType: { type: String, trim: true },
  severity: { type: String, enum: ['Critical', 'Medium', 'Low'], default: 'Low' },
  status: { type: String, enum: ['queued', 'analyzing', 'completed', 'failed'], default: 'queued' },
  assetId: { type: String, trim: true },
  productionBatch: { type: String, trim: true },
  station: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  defect2DBox: {
    x: { type: Number, min: 0, max: 1 },
    y: { type: Number, min: 0, max: 1 },
    width: { type: Number, min: 0, max: 1 },
    height: { type: Number, min: 0, max: 1 },
  },
  telemetry: {
    temperature: Number,
    vibration: Number,
    readings: { type: Map, of: Number },
  },
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'PartModel' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Inspection', inspectionSchema)
