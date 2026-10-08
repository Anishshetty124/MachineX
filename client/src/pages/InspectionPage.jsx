import { Camera, Check, ChevronDown, FileImage, LoaderCircle, Upload, UploadCloud, Video, X } from 'lucide-react'
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
  const [modelAsset, setModelAsset] = useState(null)
  const [modelStatus, setModelStatus] = useState('loading')
  const [exploded, setExploded] = useState(false)
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

    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}/api/models?partType=${encodeURIComponent(form.part)}`)
      .then((response) => {
        if (!response.ok) throw new Error('Model service unavailable')
        return response.json()
      })
      .then(({ data }) => {
        if (cancelled) return
        const selectedModel = data?.[0]
        if (!selectedModel) {
          setModelStatus('ready')
          setModelError('No stored model found; showing inspection preview')
          return
        }
        setModelAsset({ ...selectedModel, assetUrl: selectedModel.assetUrl?.startsWith('/') ? `${apiBase}${selectedModel.assetUrl}` : selectedModel.assetUrl })
        setModelStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setModelStatus('error')
          setModelError('Model service unavailable. Start the API or upload a model first.')
        }
      })

    return () => { cancelled = true }
  }, [form.part])

  const updateField = (event) => {
    const { name, value } = event.target
    if (name === 'part') {
      setModelStatus('loading')
      setModelError('')
      setModelAsset(null)
    }
    setForm((current) => ({ ...current, [name]: value }))
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
      setModelAsset({ ...result.data, assetUrl: `${apiBase}${result.data.assetUrl}` })
      setModelStatus('ready')
      setModelError('')
      setUploadStatus('success')
      setUploadMessage('Model converted and loaded from MongoDB.')
    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(error.message)
    }
  }

  return <section className="inspection-page">
    <div className="inspection-heading">
      <div><p className="eyebrow">Step 01 / evidence intake</p><h1>Start a quality inspection</h1><p className="muted">Upload or capture evidence. We will map the detected defect onto the live 3D part model.</p></div>
      <div className="model-status"><span className={modelStatus === 'ready' && modelAsset ? 'status-dot live' : 'status-dot'} />{modelStatus === 'ready' && modelAsset ? '3D model from database' : modelStatus === 'error' ? 'Model service offline' : 'Fetching model metadata'}</div>
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
          <p className="muted upload-note">Upload a single GLB, or a self-contained GLTF. Extra .bin and texture files are optional unless the GLTF references them.</p>
          <label className="file-picker">{adminModel ? adminModel.name : 'Choose .gltf or .glb model'}<input type="file" accept=".gltf,.glb,model/gltf+json,model/gltf-binary" onChange={(event) => setAdminModel(event.target.files?.[0] || null)} /></label>
          <label className="file-picker secondary-picker">{modelResources.length ? `${modelResources.length} resource file(s) selected` : 'Add referenced .bin/textures if needed'}<input type="file" multiple accept=".bin,.png,.jpg,.jpeg,.webp" onChange={(event) => setModelResources(event.target.files || [])} /></label>
          <input className="text-input" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Model name" />
          <input className="text-input" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Admin upload key (if configured)" />
          <button className="primary-button upload-submit" type="submit" disabled={uploadStatus === 'uploading'}><UploadCloud size={15} />{uploadStatus === 'uploading' ? 'Converting and uploading...' : 'Upload model to MongoDB'}</button>
          {uploadMessage && <p className={uploadStatus === 'error' ? 'upload-message error' : 'upload-message'}>{uploadMessage}</p>}
        </form>
      </div>

      <div className="panel model-panel">
        <div className="panel-heading"><div><p className="eyebrow">Spatial inspection</p><h2>{form.part} / live model</h2></div><button className={exploded ? 'secondary-button active' : 'secondary-button'} onClick={() => setExploded((value) => !value)}>{exploded ? 'Collapse assembly' : 'Explode assembly'}</button></div>
        <div className="model-stage">{modelAsset ? <BrakePad3D modelUrl={modelAsset.assetUrl} defect2DBox={{ x: 0.6, y: 0.3 }} defectType={form.defectType} severity={form.severity} exploded={exploded} /> : <div className="model-empty"><LoaderCircle size={24} className={modelStatus === 'loading' ? 'spin' : ''} /><strong>{modelStatus === 'loading' ? 'Loading model metadata' : 'No usable model loaded'}</strong><span>{modelError || 'An administrator must upload a GLTF or GLB model before inspection.'}</span></div>}{modelStatus === 'loading' && <div className="model-overlay"><LoaderCircle size={20} className="spin" />Fetching part model from database</div>}</div>
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
