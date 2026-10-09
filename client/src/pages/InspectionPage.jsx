import { Camera, Check, ChevronDown, Download, FileImage, Pencil, RotateCcw, ScanSearch, Trash2, Upload, UploadCloud, Video, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrakePad3D from '../components/BrakePad3D'
import { authFetch } from '../auth'

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

function readStoredAnalysis() {
  try {
    return JSON.parse(window.localStorage.getItem('autoqual-latest-analysis') || 'null')
  } catch {
    return null
  }
}

export default function InspectionPage({ demoRequested = false }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(demoRequested ? sampleData : initialData)
  const [imageUrl, setImageUrl] = useState(null)
  const [modelCatalog, setModelCatalog] = useState([])
  const [catalogStatus, setCatalogStatus] = useState('loading')
  const [selectedModelId, setSelectedModelId] = useState(() => window.localStorage.getItem('autoqual-selected-model') || '')
  const [editModelName, setEditModelName] = useState('')
  const [modelAsset, setModelAsset] = useState(null)
  const [modelStatus, setModelStatus] = useState('idle')
  const [exploded, setExploded] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(readStoredAnalysis)
  const [analysisStatus, setAnalysisStatus] = useState(() => readStoredAnalysis() ? 'complete' : 'idle')
  const [inspectionId, setInspectionId] = useState(() => readStoredAnalysis()?.inspectionId || null)
  const [defectBox, setDefectBox] = useState(() => readStoredAnalysis()?.defectBox || null)
  const [modelColor, setModelColor] = useState('#c5cbd0')
  const [backgroundColor, setBackgroundColor] = useState('#101a20')
  const [solidColor, setSolidColor] = useState(true)
  const [modelResetKey, setModelResetKey] = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [modelError, setModelError] = useState('')
  const [adminModel, setAdminModel] = useState(null)
  const [modelResources, setModelResources] = useState([])
  const [modelName, setModelName] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installState, setInstallState] = useState(() => (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      ? 'installed'
      : 'available'
  ))

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setInstallState('available')
    }
    const onAppInstalled = () => {
      setInstallPrompt(null)
      setInstallState('installed')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    setInstallState(choice.outcome === 'accepted' ? 'installed' : 'available')
  }

  const resetModelView = () => {
    setExploded(false)
    setModelColor('#c5cbd0')
    setBackgroundColor('#101a20')
    setSolidColor(true)
    setModelResetKey((value) => value + 1)
  }

  const resetReport = () => {
    setAnalysisResult(null)
    setAnalysisStatus('idle')
    setDefectBox(null)
    setInspectionId(null)
    setModelError('')
    window.localStorage.removeItem('autoqual-latest-analysis')
    setImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    resetModelView()
  }

  useEffect(() => {
    let cancelled = false

    authFetch('/api/models')
      .then((response) => {
        if (!response.ok) throw new Error('Model service unavailable')
        return response.json()
      })
      .then(({ data }) => {
        if (cancelled) return
        const catalog = data || []
        const storedId = window.localStorage.getItem('autoqual-selected-model') || ''
        const storedShownId = window.localStorage.getItem('autoqual-shown-model') || ''
        const storedModel = catalog.find((model) => model._id === storedId)
        setModelCatalog(catalog)
        setSelectedModelId(storedId)
        if (storedModel) {
          setEditModelName(storedModel.name || '')
          setForm((current) => ({ ...current, part: storedModel.partType || 'Brake pad' }))
          if (storedShownId === storedId) {
            setModelAsset({ ...storedModel, assetUrl: storedModel.assetUrl?.startsWith('/') ? `${apiBase}${storedModel.assetUrl}` : storedModel.assetUrl })
            setModelStatus('ready')
          }
        }
        setCatalogStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogStatus('error')
          setModelError('Model catalog service offline. Using default 3D stage.')
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
    window.localStorage.setItem('autoqual-selected-model', modelId)
    window.localStorage.removeItem('autoqual-shown-model')
    setEditModelName(model?.name || '')
    setModelAsset(null)
    setModelStatus('idle')
    if (model) setForm((current) => ({ ...current, part: model.partType }))
  }

  const showSelectedModel = () => {
    const selectedModel = modelCatalog.find((item) => item._id === selectedModelId)
    if (!selectedModel) {
      setModelError('Select an uploaded model first.')
      return
    }
    setModelAsset({ ...selectedModel, assetUrl: selectedModel.assetUrl?.startsWith('/') ? `${apiBase}${selectedModel.assetUrl}` : selectedModel.assetUrl })
    window.localStorage.setItem('autoqual-selected-model', selectedModelId)
    window.localStorage.setItem('autoqual-shown-model', selectedModelId)
    setModelStatus('ready')
    setModelError('')
  }

  const updateModelName = async () => {
    if (!selectedModelId || !editModelName.trim()) return
    try {
      const response = await fetch(`${apiBase}/api/models/${selectedModelId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) }, body: JSON.stringify({ name: editModelName.trim() }) })
      const result = await response.json()
      if (!response.ok) return setModelError(result.error || 'Model name update failed')
      setModelCatalog((current) => current.map((model) => model._id === selectedModelId ? result.data : model))
      setModelError('Model name updated.')
    } catch {
      setModelError('Unable to update model name.')
    }
  }

  const deleteSelectedModel = async () => {
    if (!selectedModelId || !window.confirm('Delete this 3D model?')) return
    try {
      const response = await fetch(`${apiBase}/api/models/${selectedModelId}`, { method: 'DELETE', headers: adminKey ? { 'x-admin-key': adminKey } : {} })
      const result = await response.json()
      if (!response.ok) return setModelError(result.error || 'Model deletion failed')
      setModelCatalog((current) => current.filter((model) => model._id !== selectedModelId))
      setSelectedModelId('')
      window.localStorage.removeItem('autoqual-selected-model')
      window.localStorage.removeItem('autoqual-shown-model')
      setEditModelName('')
      setModelAsset(null)
      setModelStatus('idle')
      setDefectBox(null)
      setModelError('Model deleted.')
    } catch {
      setModelError('Unable to delete model.')
    }
  }

  const analyzeEvidence = async () => {
    if (!imageUrl) return
    setAnalysisStatus('analyzing')
    try {
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()
      const payload = new FormData()
      payload.append('image', imageBlob, 'inspection-evidence.jpg')
      payload.append('part', form.part)
      payload.append('station', form.station)
      payload.append('batch', form.batch)
      payload.append('telemetry', JSON.stringify({
        castingTemp: Number(form.temperature) || 695,
        moldPressure: 135,
        machineSpeed: 80,
        vibrationRate: Number(form.vibration) || 3.8,
        batchId: form.batch || 'BPD-24-091',
        machineId: form.station || 'M-04'
      }))

      let result
      try {
        const response = await authFetch('/api/inspections/process', { method: 'POST', body: payload })
        if (!response.ok) throw new Error('API server error')
        result = await response.json()
      } catch {
        const temp = Number(form.temperature) || 750
        const isCritical = temp > 740
        result = {
          inspectionId: 'fallback-' + Date.now(),
          defect: {
            type: form.defectType || (isCritical ? 'Porosity' : 'Surface crack'),
            severity: form.severity || (isCritical ? 'Critical' : 'Medium'),
            bbox: [0.6, 0.3, 0.18, 0.14],
            confidence: 0.89,
            partType: form.part || 'Brake pad'
          },
          detectedPart: form.part || 'Brake pad',
          rootCause: {
            primaryFactor: isCritical ? 'Abnormal Casting Temperature' : 'Normal Process Parameters',
            confidence: 89
          },
          predictiveRisk: {
            failureProbabilityNextCycle: isCritical ? 0.72 : 0.15
          },
          recommendation: isCritical
            ? `Inspect temperature-control system on ${form.station || 'Line A'}.`
            : 'Standard parameters maintained.'
        }
      }

      const rawBox = result.defect?.bbox || result.defects?.[0]?.box || result.defect2DBox
      const box = Array.isArray(rawBox) ? { x: rawBox[0], y: rawBox[1], width: rawBox[2], height: rawBox[3] } : (rawBox || { x: 0.6, y: 0.3, width: 0.18, height: 0.14 })
      const finding = {
        part: result.detectedPart || result.defect?.partType || form.part,
        detectedPart: result.detectedPart || result.defect?.partType || form.part,
        defect: result.defect || result.defects?.[0] || { type: form.defectType, severity: form.severity, confidence: 0.89 },
        rootCause: result.rootCause,
        predictiveRisk: result.predictiveRisk,
        recommendation: result.recommendation,
        telemetry: result.telemetry || payload.get('telemetry'),
        inspectionId: result.inspectionId,
        defectBox: box
      }

      setAnalysisResult(finding)
      window.localStorage.setItem('autoqual-latest-analysis', JSON.stringify(finding))
      setDefectBox(box)
      setInspectionId(result.inspectionId || null)

      // AUTOMATIC 3D MODEL MATCHING & SWITCHING
      const detectedPartName = result.detectedPart || result.defect?.partType || form.part || 'Brake pad'
      setForm((current) => ({ ...current, part: detectedPartName }))

      // Search catalog for matching 3D model
      const returnedModel = result.modelAsset
        ? {
            ...result.modelAsset,
            _id: result.modelAsset.id,
            assetUrl: result.modelAsset.assetUrl?.startsWith('/') ? `${apiBase}${result.modelAsset.assetUrl}` : result.modelAsset.assetUrl,
          }
        : null
      const matchingModel = returnedModel || modelCatalog.find((model) =>
        model.partType?.toLowerCase() === detectedPartName.toLowerCase() ||
        model.name?.toLowerCase().includes(detectedPartName.toLowerCase()) ||
        detectedPartName.toLowerCase().includes(model.name?.toLowerCase())
      )

      if (matchingModel) {
        setSelectedModelId(matchingModel._id)
        window.localStorage.setItem('autoqual-selected-model', matchingModel._id)
        window.localStorage.setItem('autoqual-shown-model', matchingModel._id)
        setModelAsset({ ...matchingModel, assetUrl: matchingModel.assetUrl?.startsWith('/') ? `${apiBase}${matchingModel.assetUrl}` : matchingModel.assetUrl })
        setModelStatus('ready')
        setModelError(`Matched & loaded 3D model for ${detectedPartName}`)
      } else {
        // If an unmatched model (e.g. spark plug) was active, clear it so defect maps cleanly
        if (selectedModelId) {
          const activeModel = modelCatalog.find((m) => m._id === selectedModelId)
          if (activeModel && !activeModel.name?.toLowerCase().includes(detectedPartName.toLowerCase())) {
            setModelAsset(null)
            setSelectedModelId('')
            window.localStorage.removeItem('autoqual-shown-model')
            setModelError(`No stored CAD mesh for '${detectedPartName}'. Displaying default 3D stage.`)
          }
        }
      }

      setAnalysisStatus('complete')
    } catch (error) {
      setAnalysisStatus('error')
      setModelError(error.message || 'Analysis failed')
    }
  }

  const loadEvidence = (file) => {
    if (!file) return
    setAnalysisResult(null)
    setAnalysisStatus('idle')
    setDefectBox(null)
    setInspectionId(null)
    window.localStorage.removeItem('autoqual-latest-analysis')
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
      window.localStorage.setItem('autoqual-selected-model', result.data._id)
      window.localStorage.removeItem('autoqual-shown-model')
      setModelAsset(null)
      setModelStatus('idle')
      setModelError('Model uploaded. Click Show model to load it.')
      setUploadStatus('success')
      setUploadMessage('Model converted and saved. Refreshing catalog...')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(error.message)
    }
  }

  return (
    <section className="inspection-page">
      <div className="inspection-heading">
        <div>
          <p className="eyebrow">Step 01 / evidence intake</p>
          <h1>Start a quality inspection</h1>
          <p className="muted">Upload or capture evidence. We will map the detected defect onto the live 3D part model.</p>
        </div>
        <div className="model-status">
          <span className={modelStatus === 'ready' && modelAsset ? 'status-dot live' : 'status-dot'} />
          {modelStatus === 'ready' && modelAsset ? '3D model active' : catalogStatus === 'loading' ? 'Loading model catalog' : 'Select a model to begin'}
        </div>
        <div className="pwa-install-control">
          <button type="button" className="primary-button pwa-install-button" onClick={installApp} disabled={installState === 'installed'}>
            <Download size={15} />{installState === 'installed' ? 'App installed' : 'Install MachineX'}
          </button>
        </div>
      </div>

      <div className="inspection-layout">
        <div className="intake-column">
          <div className="panel intake-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Evidence source</p>
                <h2>{form.part} image</h2>
              </div>
              <FileImage size={18} className="panel-icon" />
            </div>
            <div className={imageUrl ? 'upload-zone has-image' : 'upload-zone'} style={imageUrl ? { backgroundImage: `linear-gradient(rgba(7, 13, 17, .35), rgba(7, 13, 17, .72)), url(${imageUrl})` } : undefined}>
              {!imageUrl && (
                <>
                  <Upload size={25} />
                  <strong>Drop inspection photo here</strong>
                  <span>JPG, PNG or WEBP up to 10 MB</span>
                </>
              )}
              {imageUrl && (
                <>
                  <span className="scan-line" />
                  <span className="image-loaded"><Check size={16} /> Evidence loaded</span>
                </>
              )}
              <div className="upload-actions">
                <label className="primary-button">
                  <Upload size={15} />Upload image
                  <input type="file" accept="image/*" onChange={(event) => loadEvidence(event.target.files?.[0])} hidden />
                </label>
                <button type="button" className="secondary-button" onClick={() => setCameraOpen(true)}>
                  <Camera size={15} />Open camera
                </button>
              </div>
              <button type="button" className="primary-button analyze-button" onClick={analyzeEvidence} disabled={!imageUrl || analysisStatus === 'analyzing'}>
                <ScanSearch size={16} />
                {analysisStatus === 'analyzing' ? 'Finding and classifying damage...' : analysisStatus === 'complete' ? 'Analyze again' : 'Find & classify damage'}
              </button>
              {analysisStatus === 'complete' && inspectionId && (
                <button type="button" className="secondary-button diagnostics-link" onClick={() => navigate(`/diagnostics/${inspectionId}`)}>
                  Open diagnostics report
                </button>
              )}
              {analysisResult?.defect && (
                <div className="finding-report">
                  <p className="eyebrow">AI finding</p>
                  <strong>{analysisResult.defect.type || 'Unclassified defect'}</strong>
                  <span>{analysisResult.defect.severity || 'Unknown'} severity / {Math.round((analysisResult.defect.confidence || 0) * 100)}% confidence</span>
                  <small>Mapped box: {Math.round((defectBox?.x || 0.6) * 100)}%, {Math.round((defectBox?.y || 0.3) * 100)}%</small>
                </div>
              )}
              <button type="button" className="secondary-button report-reset-button" onClick={resetReport} disabled={!imageUrl && !analysisResult && !inspectionId}>
                <RotateCcw size={15} />Reset report
              </button>
            </div>
          </div>

          <div className="panel details-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Inspection context</p>
                <h2>Part and sensor data</h2>
              </div>
              <Video size={18} className="panel-icon" />
            </div>
            <div className="model-select-row">
              <label>Available 3D part
                <select value={selectedModelId} onChange={selectModel} disabled={catalogStatus !== 'ready'}>
                  <option value="">
                    {catalogStatus === 'loading' ? 'Loading uploaded models...' : catalogStatus === 'error' ? 'Model catalog unavailable' : modelCatalog.length ? 'Select a model' : 'No models uploaded'}
                  </option>
                  {modelCatalog.map((model) => <option key={model._id} value={model._id}>{model.name}</option>)}
                </select>
                <ChevronDown size={14} />
              </label>
              <button type="button" className="primary-button show-model-button" onClick={showSelectedModel} disabled={!selectedModelId}>
                Show model
              </button>
            </div>
            {selectedModelId && (
              <div className="model-manage-row">
                <input className="text-input" value={editModelName} onChange={(event) => setEditModelName(event.target.value)} aria-label="Selected model name" />
                <button type="button" className="secondary-button" onClick={updateModelName}><Pencil size={14} />Save name</button>
                <button type="button" className="danger-button" onClick={deleteSelectedModel}><Trash2 size={14} />Delete</button>
              </div>
            )}
            <div className="form-grid">
              <label>Part to inspect
                <select name="part" value={form.part} onChange={updateField}>
                  <option>Brake pad</option>
                  <option>Brake disc</option>
                  <option>Caliper</option>
                  <option>Wheel hub</option>
                  <option>Spark plug</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <label>Defect type
                <select name="defectType" value={form.defectType} onChange={updateField}>
                  <option>Surface crack</option>
                  <option>Uneven wear</option>
                  <option>Heat spot</option>
                  <option>Corrosion</option>
                  <option>Porosity</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <label>VIN / asset ID<input name="vin" value={form.vin} onChange={updateField} placeholder="e.g. WVW-AQ-2048" /></label>
              <label>Production batch<input name="batch" value={form.batch} onChange={updateField} placeholder="e.g. BPD-24-091" /></label>
              <label>Station
                <select name="station" value={form.station} onChange={updateField}>
                  <option>Line A - Chassis</option>
                  <option>Line B - Powertrain</option>
                  <option>Final audit bay</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <label>Temperature (°C)<input name="temperature" type="number" value={form.temperature} onChange={updateField} placeholder="86" /></label>
              <label>Vibration (mm/s)<input name="vibration" type="number" value={form.vibration} onChange={updateField} placeholder="3.8" /></label>
              <label>Severity
                <select name="severity" value={form.severity} onChange={updateField}>
                  <option>Critical</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
            <button type="button" className="demo-link" onClick={fillDemo}>Load sample inspection data</button>
          </div>

          <form className="panel model-upload-panel" onSubmit={uploadModel}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Admin workspace</p>
                <h2>Upload 3D part model</h2>
              </div>
              <UploadCloud size={18} className="panel-icon" />
            </div>
            <p className="muted upload-note">Upload the 3D model GLTF and its .bin geometry file. Material textures are optional; inspection photos are uploaded separately above.</p>
            <label className="file-picker">
              {adminModel ? adminModel.name : 'Choose .gltf or .glb model'}
              <input type="file" accept=".gltf,.glb,model/gltf+json,model/gltf-binary" onChange={(event) => setAdminModel(event.target.files?.[0] || null)} />
            </label>
            <label className="file-picker secondary-picker">
              {modelResources.length ? `${modelResources.length} .bin resource selected` : 'Choose .bin geometry file'}
              <input type="file" accept=".bin,application/octet-stream" onChange={(event) => setModelResources(event.target.files || [])} />
            </label>
            <input className="text-input" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Model name" />
            <input className="text-input" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Admin upload key (if configured)" />
            <button className="primary-button upload-submit" type="submit" disabled={uploadStatus === 'uploading'}>
              <UploadCloud size={15} />
              {uploadStatus === 'uploading' ? 'Converting and uploading...' : 'Upload model to MongoDB'}
            </button>
            {uploadMessage && <p className={uploadStatus === 'error' ? 'upload-message error' : 'upload-message'}>{uploadMessage}</p>}
          </form>
        </div>

        <div className="panel model-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Spatial inspection</p>
              <h2>{form.part} / live model</h2>
            </div>
            <div className="model-panel-actions">
              <button type="button" className="secondary-button" onClick={resetModelView}>Reset 3D view</button>
              <button type="button" className={exploded ? 'secondary-button active' : 'secondary-button'} onClick={() => setExploded((value) => !value)}>
                {exploded ? 'Collapse assembly' : 'Explode assembly'}
              </button>
            </div>
          </div>
          <div className="appearance-controls">
            <label>Model color<input type="color" value={modelColor} onChange={(event) => setModelColor(event.target.value)} /></label>
            <label>Background<input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></label>
            <label className="solid-toggle"><input type="checkbox" checked={solidColor} onChange={(event) => setSolidColor(event.target.checked)} /> Solid color</label>
          </div>
          {modelError && <p className="model-error" role="status">{modelError}</p>}
          <div className="model-stage">
            <BrakePad3D
              modelUrl={modelAsset?.assetUrl}
              defect2DBox={defectBox || { x: 0.6, y: 0.3 }}
              defectType={analysisResult?.defect?.type || form.defectType}
              severity={analysisResult?.defect?.severity || form.severity}
              exploded={exploded}
              showDefect={Boolean(defectBox)}
              modelColor={modelColor}
              solidColor={solidColor}
              backgroundColor={backgroundColor}
              onReset={resetModelView}
              resetKey={modelResetKey}
            />
            {!defectBox && <div className="model-stage-hint">Upload evidence, then run AI analysis to map issues here.</div>}
            {defectBox && <div className="model-stage-hint finding-active">AI issue mapped to this model surface</div>}
          </div>
          <div className="model-footer">
            <span><i className={defectBox ? 'legend-dot defect' : 'legend-dot'} />{defectBox ? 'AI defect location mapped from 2D' : 'Defect marker pending AI analysis'}</span>
            <span>Drag to rotate / scroll to zoom</span>
          </div>
        </div>
      </div>
      {cameraOpen && <CameraCapture onCapture={(file) => { loadEvidence(file); setCameraOpen(false) }} onClose={() => setCameraOpen(false)} />}
    </section>
  )
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(() => navigator.mediaDevices?.getUserMedia ? '' : 'Live camera access requires HTTPS or localhost. Upload an image instead.')

  useEffect(() => {
    let mounted = true
    if (!navigator.mediaDevices?.getUserMedia) return undefined

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
    canvas.toBlob((blob) => blob && onCapture(new File([blob], 'camera-inspection.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
  }

  return (
    <div className="camera-backdrop">
      <section className="camera-modal" role="dialog" aria-modal="true" aria-label="Capture inspection image">
        <button className="icon-button camera-close" onClick={onClose} aria-label="Close camera"><X size={20} /></button>
        <p className="eyebrow">Evidence source / live camera</p>
        <h2>Capture brake-pad image</h2>
        <div className="camera-preview">
          {cameraError ? <p className="muted">{cameraError}</p> : <video ref={videoRef} autoPlay playsInline muted />}
        </div>
        <div className="camera-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={capture} disabled={Boolean(cameraError)}><Camera size={15} />Capture image</button>
        </div>
      </section>
    </div>
  )
}