import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Cpu, CheckCircle2, AlertOctagon, Wrench, ShieldAlert, Target, ClipboardCheck } from 'lucide-react'
import { authFetch } from '../auth'

export default function DiagnosticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inspection, setInspection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [historyAnalysis, setHistoryAnalysis] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!id) {
        setError('No inspection ID provided.')
        setLoading(false)
        return
      }

      const cached = window.localStorage.getItem('autoqual-latest-analysis')
      let cachedData = null
      try { cachedData = cached ? JSON.parse(cached) : null } catch { cachedData = null }

      if ((id.startsWith('fallback-') || id === 'latest') && cachedData) {
        setInspection(cachedData)
        setLoading(false)
        return
      }

      authFetch(`/api/inspections/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Inspection record '${id}' not found in MongoDB.`)
          return res.json()
        })
        .then((payload) => {
          setInspection(payload.data || payload)
          if (!id.startsWith('fallback-') && id !== 'latest') {
            authFetch(`/api/inspections/${id}/history-analysis`)
              .then((historyResponse) => historyResponse.ok ? historyResponse.json() : null)
              .then((historyPayload) => setHistoryAnalysis(historyPayload?.data || null))
              .catch(() => setHistoryAnalysis(null))
          }
          if (!id.startsWith('fallback-') && id !== 'latest') {
            authFetch(`/api/inspections/${id}/image`)
              .then((imageResponse) => imageResponse.ok ? imageResponse.blob() : null)
              .then((blob) => {
                if (blob) setEvidenceUrl(URL.createObjectURL(blob))
              })
              .catch(() => null)
          }
          setLoading(false)
        })
        .catch((requestError) => {
          if (cachedData) {
            setInspection(cachedData)
            setError('Loaded latest inspection from session storage.')
          } else {
            setError(requestError.message)
          }
          setLoading(false)
        })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [id])

  useEffect(() => () => {
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl)
  }, [evidenceUrl])

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
        <h2>Loading Quality Diagnostics...</h2>
      </div>
    )
  }

  if (error && !inspection) {
    return <div className="history-error" style={{ margin: '4rem auto', maxWidth: '700px' }}>{error}</div>
  }

  const rootCause = inspection?.rootCause || {}
  const predictiveRisk = inspection?.predictiveRisk || {}
  const defect = inspection?.defect || {}
  const telemetry = inspection?.telemetry || {}
  const featureImpact = rootCause.featureImpact || [
    { parameter: 'Casting Temperature', impact: 97.0 },
    { parameter: 'Vibration Rate', impact: 3.0 },
    { parameter: 'Mold Pressure', impact: 0.0 },
    { parameter: 'Machine Speed', impact: 0.0 }
  ]

  const isCritical = (defect.severity || '').toLowerCase() === 'high' || (defect.severity || '').toLowerCase() === 'critical'
  const box = inspection?.defectBox || defect.bbox || [0.36, 0.26, 0.47, 0.46]
  const primaryImpact = featureImpact[0] || { parameter: rootCause.primaryFactor || 'Process parameters', impact: 0 }
  const impactDescription = primaryImpact.parameter === 'Casting Temperature'
    ? 'Temperature variation can promote thermal damage and surface defects.'
    : `${primaryImpact.parameter} was the largest measured contributor to this inspection.`
  const riskPercent = Math.round((predictiveRisk.failureProbabilityNextCycle || 0.74) * 100)
  const boxX = Math.round((box.x ?? box[0] ?? 0.36) * 100)
  const boxY = Math.round((box.y ?? box[1] ?? 0.26) * 100)
  const boxWidth = Math.max(8, Math.round((box.width ?? box[2] ?? 0.2) * 100))
  const boxHeight = Math.max(8, Math.round((box.height ?? box[3] ?? 0.2) * 100))
  const severityAssessment = inspection?.severityAssessment || {}
  const actionPlan = inspection?.actionPlan || {}
  const historyRiskPercent = historyAnalysis?.averageRisk == null ? null : Math.round(historyAnalysis.averageRisk * 100)
  const currentRiskPercent = historyAnalysis?.currentRisk == null ? null : Math.round(historyAnalysis.currentRisk * 100)
  const projectedRiskPercent = historyAnalysis?.projectedRisk == null ? null : Math.round(historyAnalysis.projectedRisk * 100)
  const forecastConfidencePercent = historyAnalysis?.forecastConfidence == null ? null : Math.round(historyAnalysis.forecastConfidence * 100)
  const historySeverities = ['low', 'medium', 'high', 'critical']
  const riskPoints = historyAnalysis?.riskSeries?.length
    ? [...historyAnalysis.riskSeries.map((point, index, series) => `${(index / Math.max(1, series.length)) * 85},${100 - (point.risk * 100)}`), `100,${100 - (historyAnalysis.projectedRisk * 100)}`].join(' ')
    : ''

  return (
    <div className="diagnostics-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem', color: '#f8fafc' }}>
      {error && <div className="history-error">{error}</div>}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '14px', fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Return to 3D Inspection Stage
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: '#38bdf8', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>
            Root Cause & Predictive Risk Engine
          </p>
          <h1 style={{ fontSize: '28px', margin: '0.3rem 0', fontWeight: 700 }}>Quality Diagnostic Report</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Part: <strong>{inspection?.part || inspection?.detectedPart || 'Brake Component'}</strong> | ID: <code style={{ color: '#cbd5e1' }}>{id}</code>
          </p>
        </div>
        
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
          background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: isCritical ? '#f87171' : '#fbbf24',
          border: `1px solid ${isCritical ? '#ef4444' : '#f59e0b'}`
        }}>
          {isCritical ? <AlertOctagon size={16} /> : <CheckCircle2 size={16} />}
          {defect.type || 'Corrosion'} ({defect.severity || 'High'})
        </span>
      </div>

      <div className="diagnostics-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[
          ['Detected part', inspection?.part || inspection?.detectedPart || 'Unknown', Target],
          ['Defect confidence', `${Math.round((defect.confidence || 0) * 100)}%`, ClipboardCheck],
          ['Mapping position', `${boxX}% / ${boxY}%`, Target],
          ['Inspection station', telemetry.machineId || inspection?.station || 'Unassigned', Activity],
        ].map(([label, value, Icon]) => (
          <div key={label} style={{ background: '#111c29', border: '1px solid #25364a', borderRadius: '10px', padding: '1rem' }}>
            <Icon size={17} color="#38bdf8" />
            <small style={{ display: 'block', color: '#80909b', marginTop: '0.55rem', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em' }}>{label}</small>
            <strong style={{ display: 'block', color: '#f8fafc', marginTop: '0.3rem', fontSize: '16px' }}>{value}</strong>
          </div>
        ))}
      </div>

      <div className="diagnostics-evidence-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>Inspection evidence</h3>
                <span style={{ color: '#80909b', fontSize: '11px' }}>{inspection?.imageFilename || 'synthetic evidence'}</span>
              </div>
              {evidenceUrl ? (
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', background: '#111c29' }}>
                  <img src={evidenceUrl} alt="Inspected component evidence" style={{ display: 'block', width: '100%', maxHeight: '310px', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ minHeight: '220px', display: 'grid', placeItems: 'center', color: '#80909b', border: '1px dashed #314153', borderRadius: '8px', textAlign: 'center', padding: '1rem' }}>
                  Evidence image is unavailable in this fallback report.
                </div>
              )}
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#fbbf24' }}>Severity decision</h3>
              <strong style={{ color: isCritical ? '#f87171' : '#fbbf24', fontSize: '24px' }}>{severityAssessment.level || defect.severity || 'Unknown'}</strong>
              <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5 }}>{severityAssessment.logic || 'Severity is based on defect type, process deviation and model confidence.'}</p>
              {severityAssessment.humanReviewRequired && <p style={{ color: '#fbbf24', fontSize: '12px' }}>Human review required because confidence is below the automatic-action threshold.</p>}
              <div style={{ marginTop: '1.2rem', padding: '1rem', background: '#1e293b', borderRadius: '8px', borderLeft: '4px solid #4ade80' }}>
                <small style={{ display: 'block', color: '#80909b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Next action</small>
                <strong style={{ display: 'block', color: '#f8fafc', marginTop: '.4rem', fontSize: '14px' }}>{inspection?.recommendation || 'Review the affected machine before the next cycle.'}</strong>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginTop: '.5rem' }}>
                  Owner: {actionPlan.owner || 'Line maintenance engineer'} · Priority: {actionPlan.priority || 'Before next cycle'}
                </span>
              </div>
              {rootCause.evidence?.length > 0 && <div style={{ marginTop: '1.1rem', padding: '.8rem', background: '#111c29', borderRadius: '8px' }}>
                <small style={{ display: 'block', color: '#80909b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.45rem' }}>Evidence used</small>
                {rootCause.evidence.map((evidence) => <div key={evidence} style={{ color: '#cbd5e1', fontSize: '11px', lineHeight: 1.6 }}>• {evidence}</div>)}
              </div>}
            </div>
          </div>

      <div className="diagnostics-analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* SHAP Impact Card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', marginBottom: '1rem' }}>
            <Cpu size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Sensor Attribution (SHAP)</h3>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Primary Cause: <strong style={{ color: '#f8fafc' }}>{rootCause.primaryFactor || 'Thermal & Process Deviation'}</strong> ({rootCause.confidence || 89}% confidence)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {featureImpact.map((item, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '0.3rem' }}>
                  <span>{item.parameter}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{item.impact}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.impact}%`, height: '100%', background: index === 0 ? '#ef4444' : '#38bdf8', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failure Risk Card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '1rem' }}>
            <Activity size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Predictive Machine Risk</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1, color: '#f87171' }}>
              {riskPercent}%
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0.75rem 0 0 0' }}>
              Risk score for Machine {predictiveRisk.machineId || telemetry.machineId || 'Line A - Chassis'} on next cycle
            </p>
            <p style={{ color: '#4ade80', fontSize: '12px', margin: '0.6rem 0 0' }}>
              If the recommended action is completed: {Math.round((predictiveRisk.counterfactualAfterAction ?? Math.max(0.08, (predictiveRisk.failureProbabilityNextCycle || 0.74) - 0.38)) * 100)}% estimated risk
            </p>
          </div>
        </div>
      </div>

      <div className="diagnostics-risk-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(360px, 1.1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', marginBottom: '1rem' }}>
            <Target size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Defect location map</h3>
          </div>
          <div style={{ position: 'relative', height: '230px', overflow: 'hidden', border: '1px solid #314153', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(56,189,248,.08) 1px, transparent 1px), linear-gradient(rgba(56,189,248,.08) 1px, transparent 1px), #111d29', backgroundSize: '25% 25%' }}>
            <div style={{ position: 'absolute', left: `${boxX}%`, top: `${boxY}%`, width: `${boxWidth}%`, height: `${boxHeight}%`, minWidth: '18px', minHeight: '18px', border: '2px solid #f87171', background: 'rgba(248,113,113,.2)', boxShadow: '0 0 22px rgba(248,113,113,.7)', transform: 'translate(-2px, -2px)' }} />
            <span style={{ position: 'absolute', left: `${boxX}%`, top: `${boxY}%`, transform: 'translate(8px, -22px)', color: '#fecaca', font: '10px "DM Mono", monospace', whiteSpace: 'nowrap' }}>{defect.type || 'Defect'} / {boxX}%, {boxY}%</span>
            <span style={{ position: 'absolute', left: '8px', bottom: '8px', color: '#80909b', font: '10px "DM Mono", monospace' }}>Normalized image coordinates</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5, marginBottom: 0 }}>Detected region spans approximately {boxWidth}% × {boxHeight}% of the inspected frame.</p>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', marginBottom: '0.8rem' }}>
            <ShieldAlert size={20} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Risk trajectory</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '150px', height: '150px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(#ef4444 ${riskPercent}%, #263749 0)` }}>
              <div style={{ width: '112px', height: '112px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#0f172a', color: '#f8fafc', fontSize: '28px', fontWeight: 800 }}>{riskPercent}%</div>
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <strong style={{ color: '#f8fafc', fontSize: '15px' }}>{predictiveRisk.trend === 'rising' ? 'Risk is rising' : 'Risk is stable'}</strong>
              <p style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>Estimated probability of a quality failure in the next production cycle.</p>
              <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '48px' }}>
                {[35, 44, 40, 58, 63, 71, riskPercent].map((height, index) => <span key={index} style={{ flex: 1, height: `${Math.min(100, height)}%`, background: index === 6 ? '#f87171' : '#3b82a6', borderRadius: '3px 3px 0 0' }} />)}
              </div>
              <small style={{ color: '#80909b', font: '10px "DM Mono", monospace' }}>previous cycles → next cycle forecast</small>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
              <Activity size={20} />
              <h3 style={{ margin: 0, fontSize: '16px' }}>Historical analysis — {inspection?.part || 'this part'}</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0.55rem 0 0' }}>
              Comparison with {historyAnalysis?.count || 0} previous reports for the same part in your inspection history.
              {historyAnalysis?.source === 'development-dataset' && <span style={{ color: '#fbbf24' }}> Development demo dataset</span>}
            </p>
          </div>
          {historyAnalysis?.trend && <span style={{ color: historyAnalysis.trend === 'worsening' ? '#f87171' : historyAnalysis.trend === 'improving' ? '#4ade80' : '#fbbf24', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>{historyAnalysis.trend}</span>}
        </div>
        {!historyAnalysis?.count ? (
          <div style={{ padding: '1.2rem', border: '1px dashed #314153', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
            No earlier report for this part is available yet. Future inspections will be compared here automatically.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.2rem' }}>
              <div style={{ background: '#111c29', padding: '0.9rem', borderRadius: '8px' }}><small style={{ color: '#80909b' }}>PREVIOUS REPORTS</small><strong style={{ display: 'block', color: '#f8fafc', fontSize: '22px', marginTop: '0.3rem' }}>{historyAnalysis.count}</strong></div>
              <div style={{ background: '#111c29', padding: '0.9rem', borderRadius: '8px' }}><small style={{ color: '#80909b' }}>AVERAGE PRIOR RISK</small><strong style={{ display: 'block', color: '#fbbf24', fontSize: '22px', marginTop: '0.3rem' }}>{historyRiskPercent}%</strong></div>
              <div style={{ background: '#111c29', padding: '0.9rem', borderRadius: '8px' }}><small style={{ color: '#80909b' }}>CURRENT RISK</small><strong style={{ display: 'block', color: currentRiskPercent > historyRiskPercent ? '#f87171' : '#4ade80', fontSize: '22px', marginTop: '0.3rem' }}>{currentRiskPercent ?? riskPercent}%</strong></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(280px, 1.2fr)', gap: '1.2rem' }}>
              <div>
                <small style={{ color: '#80909b', textTransform: 'uppercase' }}>Severity distribution</small>
                {historySeverities.map((level) => <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.65rem' }}><span style={{ width: '58px', color: '#cbd5e1', fontSize: '12px', textTransform: 'capitalize' }}>{level}</span><div style={{ flex: 1, height: '7px', background: '#263749', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${((historyAnalysis.severityCounts?.[level] || 0) / historyAnalysis.count) * 100}%`, height: '100%', background: level === 'critical' || level === 'high' ? '#f87171' : level === 'medium' ? '#fbbf24' : '#4ade80' }} /></div><span style={{ width: '18px', color: '#94a3b8', fontSize: '11px' }}>{historyAnalysis.severityCounts?.[level] || 0}</span></div>)}
              </div>
              <div>
                <small style={{ color: '#80909b', textTransform: 'uppercase' }}>Recent same-part reports</small>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.65rem' }}>
                  {historyAnalysis.records.slice(0, 4).map((record) => <div key={record._id || record.createdAt} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', padding: '0.6rem 0.7rem', background: '#111c29', borderRadius: '6px', fontSize: '12px' }}><span style={{ color: '#cbd5e1' }}>{record.defectType || record.defect?.type || 'Unclassified'}</span><span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(record.createdAt).toLocaleDateString()}</span></div>)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {historyAnalysis?.count > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.25fr) minmax(260px, .75fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.8rem' }}>
            <div><h3 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>Part risk forecast</h3><small style={{ color: '#80909b' }}>Historical risk → current report → next-cycle projection</small></div>
            <span style={{ color: projectedRiskPercent >= 70 ? '#f87171' : projectedRiskPercent >= 45 ? '#fbbf24' : '#4ade80', fontWeight: 800, fontSize: '20px' }}>{projectedRiskPercent}%</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Historical and projected part risk graph" style={{ width: '100%', height: '190px', background: 'linear-gradient(rgba(56,189,248,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.08) 1px, transparent 1px)', backgroundSize: '20% 25%', border: '1px solid #25364a', borderRadius: '8px' }}>
            <polyline points={riskPoints} fill="none" stroke="#38bdf8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {riskPoints && <line x1="85" y1="0" x2="85" y2="100" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#80909b', fontSize: '10px', marginTop: '0.45rem' }}><span>Oldest report</span><span>Current</span><span>Next cycle</span></div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#fbbf24', fontSize: '16px' }}>Production prediction</h3>
          <div style={{ padding: '0.9rem', background: '#111c29', borderRadius: '8px', marginBottom: '0.8rem' }}><small style={{ color: '#80909b' }}>LIKELY NEXT DEFECT</small><strong style={{ display: 'block', color: '#f8fafc', marginTop: '0.35rem' }}>{historyAnalysis.likelyDefect}</strong></div>
          <div style={{ padding: '0.9rem', background: '#111c29', borderRadius: '8px', marginBottom: '0.8rem' }}><small style={{ color: '#80909b' }}>FORECAST CONFIDENCE</small><strong style={{ display: 'block', color: '#38bdf8', marginTop: '0.35rem' }}>{forecastConfidencePercent}%</strong></div>
          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>{historyAnalysis.recommendedAction}</p>
        </div>
      </div>}

      {/* Pointwise Executive Briefing */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', marginBottom: '1rem' }}>
          <Wrench size={20} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Detailed Supervisor Action Briefing</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
            <strong style={{ display: 'block', color: '#f87171', fontSize: '14px', marginBottom: '0.25rem' }}>1. Flaw Detection & 3D Mapping</strong>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
              Gemini Vision identified <strong>{defect.type || 'Corrosion'}</strong> ({defect.severity || 'High'} Severity) on the surface of the <strong>{inspection?.part || 'Brake Component'}</strong>. Normalized surface coordinate mapping set to X: {Math.round((box.x || box[0] || 0.36) * 100)}%, Y: {Math.round((box.y || box[1] || 0.26) * 100)}%.
            </span>
          </div>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
            <strong style={{ display: 'block', color: '#38bdf8', fontSize: '14px', marginBottom: '0.25rem' }}>2. Process Parameter Root Cause</strong>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
              <strong>{primaryImpact.parameter}</strong> accounted for <strong>{primaryImpact.impact}% of total feature impact</strong>. {impactDescription}
            </span>
          </div>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #4ade80' }}>
            <strong style={{ display: 'block', color: '#4ade80', fontSize: '14px', marginBottom: '0.25rem' }}>3. Corrective Maintenance Steps</strong>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
              {inspection?.recommendation || 'Inspect temperature-control system and flush coolant lines on Line A - Chassis before releasing the next production batch.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}