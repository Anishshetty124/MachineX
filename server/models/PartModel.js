const mongoose = require('mongoose')

const partModelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  partType: { type: String, required: true, trim: true, index: true },
  category: { type: String, trim: true, index: true },
  version: { type: String, default: '1.0.0' },
  format: { type: String, enum: ['glb'], default: 'glb' },
  assetUrl: { type: String, trim: true },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, index: true },
  originalFilename: String,
  contentType: { type: String, default: 'model/gltf-binary' },
  thumbnailUrl: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

module.exports = mongoose.model('PartModel', partModelSchema)
