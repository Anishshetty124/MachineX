import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, CheckSquare, Clock3, Download, FileSpreadsheet, FileText, Filter, RefreshCw, Search, Square, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { apiBase, authFetch, getAuthToken } from '../auth'

function formatDate(value) {
  if (!value) return 'Unknown date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function severityClass(severity) {
  return String(severity || 'Low').toLowerCase()
}

function exportCsv(inspections) {
  const columns = ['Date', 'Part', 'Defect', 'Severity', 'Status', 'Station', 'Production batch', 'Filename', 'Recommendation']
  const rows = inspections.map((item) => [
    formatDate(item.createdAt), item.part, item.defectType || item.defect?.type, item.severity, item.status,
    item.station, item.productionBatch, item.imageFilename, item.recommendation,
  ])
  const sheet = XLSX.utils.aoa_to_sheet([columns, ...rows])
  sheet['!cols'] = columns.map(() => ({ wch: 22 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inspection history')
  XLSX.writeFile(workbook, `machinex-inspection-history-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function printPdf(inspections) {
  const rows = inspections.map((item) => `<tr><td>${formatDate(item.createdAt)}</td><td>${item.part || ''}</td><td>${item.defectType || item.defect?.type || ''}</td><td>${item.severity || ''}</td><td>${item.station || ''}</td><td>${item.recommendation || ''}</td></tr>`).join('')
  const printWindow = window.open('', '_blank', 'width=1000,height=700')
  if (!printWindow) return
  printWindow.document.write(`<html><head><title>MachineX inspection report</title><style>body{font:14px Arial;padding:32px;color:#17232b}h1{margin-bottom:6px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #cbd5e1;padding:9px;text-align:left;vertical-align:top}th{background:#e2e8f0}</style></head><body><h1>MachineX Inspection Report</h1><p>Exported ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Part</th><th>Defect</th><th>Severity</th><th>Station</th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [inspections, setInspections] = useState([])
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch('/api/inspections')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to load inspection history')
      setInspections(payload.data || [])
      setSelectedIds(new Set())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadHistory(), 0)
    return () => window.clearTimeout(timer)
  }, [loadHistory])

  const filteredInspections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return inspections.filter((inspection) => {
      const matchesSeverity = severity === 'all' || inspection.severity === severity
      const searchable = `${inspection.part} ${inspection.defectType} ${inspection.station} ${inspection.productionBatch} ${inspection.imageFilename}`.toLowerCase()
      return matchesSeverity && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [inspections, query, severity])

  const deleteInspection = async (inspection) => {
    if (!window.confirm(`Delete the ${inspection.part || 'inspection'} record from history? This cannot be undone.`)) return
    setDeletingId(inspection._id)
    setError('')
    try {
      const response = await authFetch(`/api/inspections/${inspection._id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to delete inspection')
      setInspections((current) => current.filter((item) => item._id !== inspection._id))
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(inspection._id)
        return next
      })
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingId(null)
    }
  }

  const allVisibleSelected = filteredInspections.length > 0 && filteredInspections.every((inspection) => selectedIds.has(inspection._id))

  const toggleSelection = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) filteredInspections.forEach((inspection) => next.delete(inspection._id))
      else filteredInspections.forEach((inspection) => next.add(inspection._id))
      return next
    })
  }

  const deleteSelected = async () => {
    const ids = [...selectedIds]
    if (!ids.length || !window.confirm(`Delete ${ids.length} selected inspection${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return
    setBulkDeleting(true)
    setError('')
    try {
      const response = await authFetch('/api/inspections/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to delete selected inspections')
      const deletedIds = new Set(payload.deletedIds?.map(String) || ids)
      setInspections((current) => current.filter((inspection) => !deletedIds.has(String(inspection._id))))
      setSelectedIds(new Set())
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <section className="history-page">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Inspection archive</p>
          <h1>History</h1>
          <p className="muted">Review every completed inspection and remove records that are no longer needed.</p>
        </div>
        <button type="button" className="secondary-button" onClick={loadHistory} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button>
      </div>

      <div className="history-summary">
        <div className="history-stat"><CalendarDays size={17} /><span><strong>{inspections.length}</strong> total inspections</span></div>
        <div className="history-stat"><CheckCircle2 size={17} /><span><strong>{inspections.filter((item) => item.status === 'completed').length}</strong> completed</span></div>
        <div className="history-stat"><AlertTriangle size={17} /><span><strong>{inspections.filter((item) => ['Critical', 'High'].includes(item.severity)).length}</strong> high-priority</span></div>
      </div>

      <div className="history-toolbar panel">
        <label className="history-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search part, defect, station, or batch" /></label>
        <label className="history-filter"><Filter size={15} /><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severities</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></label>
        <button type="button" className="history-select-all" onClick={toggleVisibleSelection} disabled={!filteredInspections.length}>
          {allVisibleSelected ? <CheckSquare size={15} /> : <Square size={15} />}
          {allVisibleSelected ? 'Clear visible' : 'Select visible'}
        </button>
        <button type="button" className="history-delete history-bulk-delete" onClick={deleteSelected} disabled={!selectedIds.size || bulkDeleting}>
          <Trash2 size={15} /> {bulkDeleting ? 'Deleting...' : `Delete selected${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
        </button>
        <button type="button" className="history-export" onClick={() => exportCsv(filteredInspections)} disabled={!filteredInspections.length}><FileSpreadsheet size={15} /> Excel</button>
        <button type="button" className="history-export" onClick={() => printPdf(filteredInspections)} disabled={!filteredInspections.length}><FileText size={15} /> PDF</button>
      </div>

      {error && <div className="history-error"><AlertTriangle size={16} /> {error}</div>}

      <div className="history-list panel">
        {loading ? <div className="history-empty"><Clock3 size={22} /><p>Loading inspection history...</p></div> : !filteredInspections.length ? <div className="history-empty"><Search size={22} /><p>{inspections.length ? 'No inspections match your filters.' : 'No inspection history yet.'}</p></div> : filteredInspections.map((inspection) => (
          <article className="history-row" key={inspection._id}>
            <label className="history-checkbox" aria-label={`Select ${inspection.part || 'inspection'}`}>
              <input type="checkbox" checked={selectedIds.has(inspection._id)} onChange={() => toggleSelection(inspection._id)} />
              <span />
            </label>
            {inspection.imageGridFsId ? <img className="history-image" src={`${apiBase}/api/inspections/${inspection._id}/image?token=${encodeURIComponent(getAuthToken() || '')}`} alt={`${inspection.part || 'Inspection'} evidence`} /> : <div className="history-image history-image-empty"><Download size={18} /></div>}
            <div className="history-part-mark">{(inspection.part || 'U').slice(0, 1).toUpperCase()}</div>
            <div className="history-main">
              <div className="history-row-title"><h2>{inspection.part || 'Unknown part'}</h2><span className={`severity-badge ${severityClass(inspection.severity)}`}>{inspection.severity || 'Low'}</span></div>
              <p className="history-defect">{inspection.defectType || inspection.defect?.type || 'Unclassified defect'}</p>
              <div className="history-meta"><span>{formatDate(inspection.createdAt)}</span>{inspection.station && <span>{inspection.station}</span>}{inspection.productionBatch && <span>Batch {inspection.productionBatch}</span>}{inspection.imageFilename && <span>{inspection.imageFilename}</span>}</div>
            </div>
            <div className="history-actions">
              <button type="button" className="secondary-button" onClick={() => navigate(`/diagnostics/${inspection._id}`)}>View report</button>
              <button type="button" className="history-export-icon" onClick={() => printPdf([inspection])} aria-label="Export PDF" title="Export PDF"><FileText size={16} /></button>
              <button type="button" className="history-delete" onClick={() => deleteInspection(inspection)} disabled={deletingId === inspection._id} aria-label={`Delete ${inspection.part || 'inspection'}`}><Trash2 size={16} />{deletingId === inspection._id ? 'Deleting' : 'Delete'}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
