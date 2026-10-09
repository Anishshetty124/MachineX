import { ArrowRight, Boxes, CircleCheck, ClipboardCheck, ScanSearch, ShieldCheck, Sparkles, UploadCloud, Workflow } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import FloatingParts from '../components/FloatingParts'

const capabilities = [
  ['01', 'Capture evidence', 'Upload a part image or open the camera directly from the inspection workspace.', ScanSearch],
  ['02', 'Map the defect', 'MachineX uses AI evidence analysis and a live 3D model to pinpoint damage.', Sparkles],
  ['03', 'Act with confidence', 'Review severity, history, and parts availability before the next action.', CircleCheck],
]

const workspaceHighlights = [
  ['Inspection-ready evidence', 'Use a clear 2D image to give the AI a reliable visual starting point.', UploadCloud],
  ['Context that teams can trust', 'Pair visual findings with telemetry, severity, and process history.', Workflow],
  ['A shared quality language', 'Keep diagnostics, parts availability, and follow-up actions in one place.', Boxes],
]

const qualityOutcomes = [
  ['Clear findings', 'Turn a part photo into a structured defect finding with location, severity, and confidence.', ClipboardCheck],
  ['Faster handoffs', 'Give operators, supervisors, and maintenance teams the same evidence and recommended next step.', Workflow],
  ['Better traceability', 'Keep inspection history available so recurring patterns are easier to spot and act on.', ShieldCheck],
]

export default function OverviewPage() {
  return (
    <div className="overview-page">
      <FloatingParts />
      <section className="overview-hero">
        <div className="overview-copy">
          <p className="eyebrow">MachineX / quality operations</p>
          <h1>Quality decisions, built around the part.</h1>
          <p className="overview-lede">MachineX gives production teams a faster way to inspect automotive components, understand defects, and move from evidence to action.</p>
          <div className="overview-actions">
            <NavLink className="primary-button" to="/inspection">Start quality inspection <ArrowRight size={16} /></NavLink>
            <NavLink className="secondary-button" to="/diagnostics/latest">View diagnostics</NavLink>
          </div>
          <div className="overview-proof"><ShieldCheck size={16} /><span>Evidence-led workflow</span><span className="overview-proof-divider" /><span>Live 3D part context</span></div>
        </div>
        <div className="overview-visual">
          <div className="overview-orb"><Boxes size={46} /><span>Parts intelligence</span><small>Ready for inspection</small></div>
          <div className="overview-signal signal-one" />
          <div className="overview-signal signal-two" />
        </div>
      </section>
      <section className="overview-section">
        <div className="overview-section-heading"><div><p className="eyebrow">How it works</p><h2>From evidence to a clear next step.</h2></div><p className="muted">One workspace for the signals that keep your line moving.</p></div>
        <div className="overview-capabilities">{capabilities.map(([number, title, description, Icon]) => <article className="overview-capability" key={number}><span className="overview-number">{number}</span><Icon size={19} /><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section className="overview-section overview-highlights">
        <div className="overview-section-heading"><div><p className="eyebrow">Built for the floor</p><h2>Make every inspection easier to explain.</h2></div><p className="muted">Start with a 2D image, then let the workspace connect the details.</p></div>
        <div className="overview-highlight-grid">{workspaceHighlights.map(([title, description, Icon]) => <article className="overview-highlight" key={title}><div className="overview-highlight-icon"><Icon size={20} /></div><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
        <div className="overview-bottom-cta"><div><p className="eyebrow">Ready when you are</p><h2>Bring the next part into focus.</h2></div><NavLink className="primary-button" to="/inspection">Add a 2D image <ArrowRight size={16} /></NavLink></div>
      </section>
      <section className="overview-section overview-outcomes">
        <div className="overview-section-heading"><div><p className="eyebrow">The quality loop</p><h2>See more than a pass or fail.</h2></div><p className="muted">MachineX helps teams understand what happened and decide what to do next.</p></div>
        <div className="overview-outcome-grid">{qualityOutcomes.map(([title, description, Icon]) => <article className="overview-outcome" key={title}><Icon size={21} /><h3>{title}</h3><p>{description}</p></article>)}</div>
        <div className="overview-quote"><Sparkles size={20} /><p>“A good inspection does more than detect a defect. It gives the next person enough context to move with confidence.”</p></div>
      </section>
    </div>
  )
}
