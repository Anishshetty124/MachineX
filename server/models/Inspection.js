const mongoose = require('mongoose')

const inspectionSchema = new mongoose.Schema({
  part: { type: String, required: true, trim: true },
  defectType: { type: String, trim: true },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Low' },
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
    castingTemp: Number,
    moldPressure: Number,
    machineSpeed: Number,
    vibrationRate: Number,
    batchId: String,
    machineId: String,
    readings: { type: Map, of: Number },
  },
  defect: { type: mongoose.Schema.Types.Mixed },
  rootCause: { type: mongoose.Schema.Types.Mixed },
  predictiveRisk: { type: mongoose.Schema.Types.Mixed },
  recommendation: String,
  imageFilename: String,
  imageGridFsId: { type: mongoose.Schema.Types.ObjectId, index: true },
  imageContentType: String,
  telemetryHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'PartModel' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Inspection', inspectionSchema)
