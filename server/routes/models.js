const router = require('express').Router()
const PartModel = require('../models/PartModel')
const path = require('node:path')
const mongoose = require('mongoose')
const { GridFSBucket, ObjectId } = mongoose.mongo
const multer = require('multer')
const { gltfToGlb } = require('gltf-pipeline')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 21 },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, file.fieldname === 'model' ? ['.gltf', '.glb'].includes(extension) : true)
  },
})

function requireAdminUpload(request, response, next) {
  const configuredKey = process.env.ADMIN_UPLOAD_KEY
  if (configuredKey && request.get('x-admin-key') !== configuredKey) return response.status(401).json({ error: 'Admin upload key is invalid' })
  if (!configuredKey && process.env.NODE_ENV === 'production') return response.status(503).json({ error: 'ADMIN_UPLOAD_KEY is not configured' })
  next()
}

function getBucket() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return null
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'partModels' })
}

function dataUri(buffer, file) {
  const mime = file.mimetype || 'application/octet-stream'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

async function normalizeToGlb(modelFile, resourceFiles = []) {
  if (path.extname(modelFile.originalname).toLowerCase() === '.glb') return modelFile.buffer

  let document
  try {
    document = JSON.parse(modelFile.buffer.toString('utf8'))
  } catch {
    const error = new Error('The uploaded GLTF file is not valid JSON')
    error.statusCode = 400
    throw error
  }
  const resources = new Map(resourceFiles.map((file) => [path.basename(file.originalname), file]))
  const embedResources = (items = []) => items.forEach((item) => {
    if (!item.uri || item.uri.startsWith('data:')) return
    const resource = resources.get(path.basename(item.uri))
    if (!resource) {
      const error = new Error(`Missing GLTF resource: ${item.uri}. Select this file in the resource upload field.`)
      error.statusCode = 400
      throw error
    }
    item.uri = dataUri(resource.buffer, resource)
  })

  embedResources(document.buffers)
  embedResources(document.images)
  const result = await gltfToGlb(document)
  return result.glb
}

router.get('/', async (request, response, next) => {
  try {
    const filter = request.query.partType ? { partType: request.query.partType } : {}
    const models = await PartModel.find({ ...filter, active: true }).sort({ createdAt: -1 }).lean()
    response.json({ data: models })
  } catch (error) {
    next(error)
  }
})

router.post('/upload', requireAdminUpload, upload.fields([{ name: 'model', maxCount: 1 }, { name: 'resources', maxCount: 20 }]), async (request, response, next) => {
  let model
  try {
    const modelFile = request.files?.model?.[0]
    const bucket = getBucket()
    if (!modelFile) return response.status(400).json({ error: 'Upload a .gltf or .glb file as model' })
    if (!bucket) return response.status(503).json({ error: 'MongoDB must be connected before uploading models' })

    let glbBuffer
    try {
      glbBuffer = await normalizeToGlb(modelFile, request.files?.resources || [])
    } catch (error) {
      return response.status(error.statusCode || 422).json({ error: error.message })
    }
    model = await PartModel.create({
      name: request.body.name || path.basename(modelFile.originalname, path.extname(modelFile.originalname)),
      partType: request.body.partType || 'Brake pad',
      version: request.body.version || '1.0.0',
      format: 'glb',
      originalFilename: modelFile.originalname,
      metadata: { sourceFormat: path.extname(modelFile.originalname).slice(1), normalized: true },
    })

    const filename = `${model._id}.glb`
    const gridFsId = new ObjectId()
    await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStreamWithId(gridFsId, filename, { contentType: 'model/gltf-binary', metadata: { modelId: model._id.toString() } })
      stream.on('finish', resolve)
      stream.on('error', reject)
      stream.end(glbBuffer)
    })

    model.gridFsId = gridFsId
    model.contentType = 'model/gltf-binary'
    model.assetUrl = `/api/models/${model._id}/file`
    await model.save()
    response.status(201).json({ data: model })
  } catch (error) {
    if (model?._id) await PartModel.findByIdAndDelete(model._id)
    next(error)
  }
})

router.get('/:id/file', async (request, response, next) => {
  try {
    if (!ObjectId.isValid(request.params.id)) return response.status(404).end()
    const model = await PartModel.findById(request.params.id).lean()
    const bucket = getBucket()
    if (!model?.gridFsId || !bucket) return response.status(404).end()
    response.type('model/gltf-binary')
    bucket.openDownloadStream(new ObjectId(model.gridFsId)).on('error', next).pipe(response)
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
