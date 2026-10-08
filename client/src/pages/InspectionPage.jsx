import { Camera, Check, ChevronDown, FileImage, LoaderCircle, Upload, Video } from 'lucide-react'
import { useState } from 'react'
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

export default function InspectionPage({ demoRequested = false }) {
  const [form, setForm] = useState(demoRequested ? sampleData : initialData)
  const [imageUrl, setImageUrl] = useState(null)
  const [modelStatus, setModelStatus] = useState('idle')
  const [exploded, setExploded] = useState(false)

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const loadModel = (file) => {
    if (file) setImageUrl(URL.createObjectURL(file))
    setModelStatus('loading')
    window.setTimeout(() => setModelStatus('ready'), 650)
  }

  const fillDemo = () => {
    setForm(sampleData)
    setModelStatus('ready')
  }

  return <section className="inspection-page">
    <div className="inspection-heading">
      <div><p className="eyebrow">Step 01 / evidence intake</p><h1>Start a quality inspection</h1><p className="muted">Upload or capture evidence. We will map the detected defect onto the live 3D part model.</p></div>
      <div className="model-status"><span className={modelStatus === 'ready' ? 'status-dot live' : 'status-dot'} />{modelStatus === 'ready' ? '3D model ready' : modelStatus === 'loading' ? 'Fetching model' : 'Awaiting evidence'}</div>
    </div>

    <div className="inspection-layout">
      <div className="intake-column">
        <div className="panel intake-panel">
          <div className="panel-heading"><div><p className="eyebrow">Evidence source</p><h2>Brake pad image</h2></div><FileImage size={18} className="panel-icon" /></div>
          <div className={imageUrl ? 'upload-zone has-image' : 'upload-zone'} style={imageUrl ? { backgroundImage: `linear-gradient(rgba(7, 13, 17, .35), rgba(7, 13, 17, .72)), url(${imageUrl})` } : undefined}>
            {!imageUrl && <><Upload size={25} /><strong>Drop inspection photo here</strong><span>JPG, PNG or WEBP up to 10 MB</span></>}
            {imageUrl && <><span className="scan-line" /><span className="image-loaded"><Check size={16} /> Evidence loaded</span></>}
            <div className="upload-actions"><label className="primary-button"><Upload size={15} />Upload image<input type="file" accept="image/*" onChange={(event) => loadModel(event.target.files?.[0])} hidden /></label><label className="secondary-button"><Camera size={15} />Camera<input type="file" accept="image/*" capture="environment" onChange={(event) => loadModel(event.target.files?.[0])} hidden /></label></div>
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
      </div>

      <div className="panel model-panel">
        <div className="panel-heading"><div><p className="eyebrow">Spatial inspection</p><h2>{form.part} / live model</h2></div><button className={exploded ? 'secondary-button active' : 'secondary-button'} onClick={() => setExploded((value) => !value)}>{exploded ? 'Collapse assembly' : 'Explode assembly'}</button></div>
        <div className="model-stage"><BrakePad3D defect2DBox={{ x: 0.6, y: 0.3 }} defectType={form.defectType} severity={form.severity} exploded={exploded} />{modelStatus === 'loading' && <div className="model-overlay"><LoaderCircle size={20} className="spin" />Fetching brake-pad model</div>}{modelStatus === 'idle' && <div className="model-hint">Upload evidence to activate model mapping</div>}</div>
        <div className="model-footer"><span><i className="legend-dot defect" />Defect location mapped from 2D</span><span>Drag to rotate / scroll to zoom</span></div>
      </div>
    </div>
  </section>
}
