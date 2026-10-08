import { Camera, Check, ChevronDown, FileImage, Pencil, Trash2, Upload, UploadCloud, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BrakePad3D from '../components/BrakePad3D'

const initialData = {
  part: 'Brake pad',
  defectType: 'Surface crack',
  severity: 'Critical',
  vin: '',
  station: 'Line A - Chassis',
  batch: '',
  temperature: '',
  vibration: '',
}

const sampleData = {
  part: 'Brake pad',
  defectType: 'Surface crack',
  severity: 'Critical',
  vin: 'WVW-AQ-2048',
  station: 'Line A - Chassis',
  batch: 'BPD-24-091',
  temperature: '86',
  vibration: '3.8',
}
const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export default function InspectionPage({ demoRequested = false }) {
  const [form, setForm] = useState(demoRequested ? sampleData : initialData)
  const [imageUrl, setImageUrl] = useState(null)
  const [modelCatalog, setModelCatalog] = useState([])
  const [catalogStatus, setCatalogStatus] = useState('loading')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [editModelName, setEditModelName] = useState('')
  const [modelAsset, setModelAsset] = useState(null)
  const [modelStatus, setModelStatus] = useState('idle')
  const [exploded, setExploded] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [defectBox, setDefectBox] = useState(null)
  const [modelColor, setModelColor] = useState('#c5cbd0')
  const [backgroundColor, setBackgroundColor] = useState('#101a20')
  const [solidColor, setSolidColor] = useState(true)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [modelError, setModelError] = useState('')
  const [adminModel, setAdminModel] = useState(null)
  const [modelResources, setModelResources] = useState([])
  const [modelName, setModelName] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch(`${apiBase}/api/models`)
      .then((response) => {
        if (!response.ok) throw new Error('Model service unavailable')
        return response.json()
      })
      .then(({ data }) => {
        if (cancelled) return
        setModelCatalog(data || [])
        setCatalogStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogStatus('error')
          setModelError('Model service unavailable. Start the API or upload a model first.')
        }
      })

    return () => { cancelled = true }
  }, [])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const selectModel = (event) => {
    const modelId = event.target.value
    const model = modelCatalog.find((item) => item._id === modelId)
    setSelectedModelId(modelId)
    setEditModelName(model?.name || '')
    setModelAsset(null)
    setModelStatus('idle')
    setDefectBox(null)
    setAnalysisStatus('idle')
    if (model) setForm((current) => ({ ...current, part: model.partType }))
  }

  const showSelectedModel = () => {
    const selectedModel = modelCatalog.find((item) => item._id === selectedModelId)
    if (!selectedModel) {
      setModelError('Select an uploaded model first.')
      return
    }
    setModelAsset({ ...selectedModel, assetUrl: selectedModel.assetUrl?.startsWith('/') ? `${apiBase}${selectedModel.assetUrl}` : selectedModel.assetUrl })
    setModelStatus('ready')
    setModelError('')
    setDefectBox(null)
    setAnalysisStatus('idle')
  }

  const updateModelName = async () => {
    if (!selectedModelId || !editModelName.trim()) return
    const response = await fetch(`${apiBase}/api/models/${selectedModelId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) }, body: JSON.stringify({ name: editModelName.trim() }) })
    const result = await response.json()
    if (!response.ok) return setModelError(result.error || 'Model name update failed')
    setModelCatalog((current) => current.map((model) => model._id === selectedModelId ? result.data : model))
    setModelError('Model name updated.')
  }

  const deleteSelectedModel = async () => {
    if (!selectedModelId || !window.confirm('Delete this 3D model from MongoDB?')) return
    const response = await fetch(`${apiBase}/api/models/${selectedModelId}`, { method: 'DELETE', headers: adminKey ? { 'x-admin-key': adminKey } : {} })
    const result = await response.json()
    if (!response.ok) return setModelError(result.error || 'Model deletion failed')
    setModelCatalog((current) => current.filter((model) => model._id !== selectedModelId))
    setSelectedModelId('')
    setEditModelName('')
    setModelAsset(null)
    setModelStatus('idle')
    setDefectBox(null)
    setModelError('Model deleted.')
  }

  const analyzeEvidence = async () => {
    if (!imageUrl || !modelAsset) return
    setAnalysisStatus('analyzing')
    try {
      const response = await fetch(`${import.meta.env.VITE_AI_API_URL ?? 'http://localhost:8000'}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inspection_id: form.vin || null, measurements: { temperature: Number(form.temperature) || 0, vibration: Number(form.vibration) || 0 } }) })
      if (!response.ok) throw new Error('AI analysis service unavailable')
      const result = await response.json()
      const box = result.defects?.[0]?.box || result.defect2DBox
      setDefectBox(box || null)
      setAnalysisStatus('complete')
      setModelError(box ? '' : 'AI analysis completed; no defect location was returned yet.')
    } catch (error) {
      setAnalysisStatus('error')
      setModelError(error.message)
    }
  }

  const loadEvidence = (file) => {
    if (!file) return
    setImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  const fillDemo = () => {
    setForm(sampleData)
    loadEvidence(null)
  }

  const uploadModel = async (event) => {
    event.preventDefault()
    if (!adminModel) return setUploadMessage('Choose a .gltf or .glb model first.')
    setUploadStatus('uploading')
    setUploadMessage('Converting model and storing it in MongoDB...')
    const payload = new FormData()
    payload.append('model', adminModel)
    Array.from(modelResources).forEach((resource) => payload.append('resources', resource))
    payload.append('name', modelName || adminModel.name.replace(/\.(gltf|glb)$/i, ''))
    payload.append('partType', form.part)
    try {
      const response = await fetch(`${apiBase}/api/models/upload`, { method: 'POST', headers: adminKey ? { 'x-admin-key': adminKey } : {}, body: payload })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Model upload failed')
      setModelCatalog((current) => [result.data, ...current])
      setSelectedModelId(result.data._id)
      setModelAsset(null)
      setModelStatus('idle')
      setModelError('Model uploaded. Click Show model to load it.')
      setUploadStatus('success')
      setUploadMessage('Model converted and saved. Refreshing model catalog...')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(error.message)
    }
  }

  return <section className="inspection-page">
    <div className="inspection-heading">
      <div><p className="eyebrow">Step 01 / evidence intake</p><h1>Start a quality inspection</h1><p className="muted">Upload or capture evidence. We will map the detected defect onto the live 3D part model.</p></div>
      <div className="model-status"><span className={modelStatus === 'ready' && modelAsset ? 'status-dot live' : 'status-dot'} />{modelStatus === 'ready' && modelAsset ? '3D model active' : catalogStatus === 'loading' ? 'Loading model catalog' : 'Select a model to begin'}</div>
    </div>

    <div className="inspection-layout">
      <div className="intake-column">
        <div className="panel intake-panel">
          <div className="panel-heading"><div><p className="eyebrow">Evidence source</p><h2>Brake pad image</h2></div><FileImage size={18} className="panel-icon" /></div>
          <div className={imageUrl ? 'upload-zone has-image' : 'upload-zone'} style={imageUrl ? { backgroundImage: `linear-gradient(rgba(7, 13, 17, .35), rgba(7, 13, 17, .72)), url(${imageUrl})` } : undefined}>
            {!imageUrl && <><Upload size={25} /><strong>Drop inspection photo here</strong><span>JPG, PNG or WEBP up to 10 MB</span></>}
            {imageUrl && <><span className="scan-line" /><span className="image-loaded"><Check size={16} /> Evidence loaded</span></>}
            <div className="upload-actions"><label className="primary-button"><Upload size={15} />Upload image<input type="file" accept="image/*" onChange={(event) => loadEvidence(event.target.files?.[0])} hidden /></label><button className="secondary-button" onClick={() => setCameraOpen(true)}><Camera size={15} />Open camera</button></div>
          </div>
        </div>

        <div className="panel details-panel">
          <div className="panel-heading"><div><p className="eyebrow">Inspection context</p><h2>Part and sensor data</h2></div><Video size={18} className="panel-icon" /></div>
          <div className="model-select-row"><label>Available 3D part<select value={selectedModelId} onChange={selectModel} disabled={catalogStatus !== 'ready'}><option value="">{catalogStatus === 'loading' ? 'Loading uploaded models...' : catalogStatus === 'error' ? 'Model catalog unavailable' : modelCatalog.length ? 'Select a model' : 'No models uploaded'}</option>{modelCatalog.map((model) => <option key={model._id} value={model._id}>{model.name}</option>)}</select><ChevronDown size={14} /></label><button type="button" className="primary-button show-model-button" onClick={showSelectedModel} disabled={!selectedModelId}>Show model</button></div>
          {selectedModelId && <div className="model-manage-row"><input className="text-input" value={editModelName} onChange={(event) => setEditModelName(event.target.value)} aria-label="Selected model name" /><button type="button" className="secondary-button" onClick={updateModelName}><Pencil size={14} />Save name</button><button type="button" className="danger-button" onClick={deleteSelectedModel}><Trash2 size={14} />Delete</button></div>}
          <div className="form-grid">
            <label>Part to inspect<select name="part" value={form.part} onChange={updateField}><option>Brake pad</option><option>Brake disc</option><option>Caliper</option><option>Wheel hub</option></select><ChevronDown size={14} /></label>
            <label>Defect type<select name="defectType" value={form.defectType} onChange={updateField}><option>Surface crack</option><option>Uneven wear</option><option>Heat spot</option><option>Corrosion</option></select><ChevronDown size={14} /></label>
            <label>VIN / asset ID<input name="vin" value={form.vin} onChange={updateField} placeholder="e.g. WVW-AQ-2048" /></label>
            <label>Production batch<input name="batch" value={form.batch} onChange={updateField} placeholder="e.g. BPD-24-091" /></label>
            <label>Station<select name="station" value={form.station} onChange={updateField}><option>Line A - Chassis</option><option>Line B - Powertrain</option><option>Final audit bay</option></select><ChevronDown size={14} /></label>
            <label>Temperature (°C)<input name="temperature" type="number" value={form.temperature} onChange={updateField} placeholder="86" /></label>
            <label>Vibration (mm/s)<input name="vibration" type="number" value={form.vibration} onChange={updateField} placeholder="3.8" /></label>
            <label>Severity<select name="severity" value={form.severity} onChange={updateField}><option>Critical</option><option>Medium</option><option>Low</option></select><ChevronDown size={14} /></label>
          </div>
          <button className="demo-link" onClick={fillDemo}>Load sample inspection data</button>
        </div>

        <form className="panel model-upload-panel" onSubmit={uploadModel}>
          <div className="panel-heading"><div><p className="eyebrow">Admin workspace</p><h2>Upload 3D part model</h2></div><UploadCloud size={18} className="panel-icon" /></div>
          <p className="muted upload-note">Upload the 3D model GLTF and its .bin geometry file. Material textures are optional; inspection photos are uploaded separately above.</p>
          <label className="file-picker">{adminModel ? adminModel.name : 'Choose .gltf or .glb model'}<input type="file" accept=".gltf,.glb,model/gltf+json,model/gltf-binary" onChange={(event) => setAdminModel(event.target.files?.[0] || null)} /></label>
          <label className="file-picker secondary-picker">{modelResources.length ? `${modelResources.length} .bin resource selected` : 'Choose .bin geometry file'}<input type="file" accept=".bin,application/octet-stream" onChange={(event) => setModelResources(event.target.files || [])} /></label>
          <input className="text-input" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Model name" />
          <input className="text-input" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Admin upload key (if configured)" />
          <button className="primary-button upload-submit" type="submit" disabled={uploadStatus === 'uploading'}><UploadCloud size={15} />{uploadStatus === 'uploading' ? 'Converting and uploading...' : 'Upload model to MongoDB'}</button>
          {uploadMessage && <p className={uploadStatus === 'error' ? 'upload-message error' : 'upload-message'}>{uploadMessage}</p>}
        </form>
      </div>

      <div className="panel model-panel">
      <div className="panel-heading"><div><p className="eyebrow">Spatial inspection</p><h2>{form.part} / live model</h2></div><button className={exploded ? 'secondary-button active' : 'secondary-button'} onClick={() => setExploded((value) => !value)}>{exploded ? 'Collapse assembly' : 'Explode assembly'}</button></div>
      <div className="appearance-controls"><label>Model color<input type="color" value={modelColor} onChange={(event) => setModelColor(event.target.value)} /></label><label>Background<input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label><label className="solid-toggle"><input type="checkbox" checked={solidColor} onChange={(event) => setSolidColor(event.target.checked)} /> Solid color</label></div>
      <div className="model-stage">{modelAsset ? <BrakePad3D modelUrl={modelAsset.assetUrl} defect2DBox={defectBox || { x: 0.5, y: 0.5 }} defectType={form.defectType} severity={form.severity} exploded={exploded} showDefect={Boolean(defectBox)} modelColor={modelColor} solidColor={solidColor} backgroundColor={backgroundColor} /> : <div className="model-empty"><strong>Select an uploaded part model</strong><span>{modelError || 'Choose a model from the catalog, then click Show model.'}</span></div>}{modelAsset && !defectBox && <div className="model-stage-hint">Upload evidence, then run AI analysis to map issues here.</div>}</div>
        <div className="model-footer"><span><i className={defectBox ? 'legend-dot defect' : 'legend-dot'} />{defectBox ? 'AI defect location mapped from 2D' : 'Defect marker pending AI analysis'}</span>{modelAsset && <button type="button" className="secondary-button" onClick={analyzeEvidence} disabled={!imageUrl || analysisStatus === 'analyzing'}>{analysisStatus === 'analyzing' ? 'Analyzing image...' : 'Analyze with AI'}</button>}</div>
        <div className="model-footer"><span><i className="legend-dot defect" />Defect location mapped from 2D</span><span>Drag to rotate / scroll to zoom</span></div>
      </div>
    </div>
    {cameraOpen && <CameraCapture onCapture={(file) => { loadEvidence(file); setCameraOpen(false) }} onClose={() => setCameraOpen(false)} />}
  </section>
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(() => navigator.mediaDevices?.getUserMedia ? '' : 'Live camera access requires HTTPS or localhost. Upload an image instead.')

  useEffect(() => {
    let mounted = true
    if (!navigator.mediaDevices?.getUserMedia) {
      return undefined
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (!mounted) return stream.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCameraError('Camera access was blocked. Allow camera permission or upload an image instead.'))

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => blob && onCapture(new File([blob], 'camera-inspection.jpg', { type: 'image/jpeg' })), 'image/jpeg', .92)
  }

  return <div className="camera-backdrop"><section className="camera-modal" role="dialog" aria-modal="true" aria-label="Capture inspection image"><button className="icon-button camera-close" onClick={onClose} aria-label="Close camera"><X size={20} /></button><p className="eyebrow">Evidence source / live camera</p><h2>Capture brake-pad image</h2><div className="camera-preview">{cameraError ? <p className="muted">{cameraError}</p> : <video ref={videoRef} autoPlay playsInline muted />}</div><div className="camera-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={capture} disabled={Boolean(cameraError)}><Camera size={15} />Capture image</button></div></section></div>
}
