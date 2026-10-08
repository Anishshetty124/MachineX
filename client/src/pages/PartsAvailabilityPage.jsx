import { useMemo, useState } from 'react'
import { ArrowUpRight, Boxes, CheckCircle2, ExternalLink, Globe2, Search, ShoppingCart, Wrench } from 'lucide-react'

const integrations = [
  {
    name: 'TrustedParts',
    category: 'Parts discovery',
    description: 'Search manufacturer parts, distributors, alternatives, and purchasing data from a trusted parts catalog.',
    use: 'Find compatible replacement candidates after an inspection.',
    url: 'https://www.trustedparts.com/en/docs/api',
    accent: 'orange',
  },
  {
    name: 'Volvo Penta Product',
    category: 'Manufacturer catalog',
    description: 'Retrieve part numbers, specifications, replacement relationships, and retail product information.',
    use: 'Resolve an inspected component to an authoritative manufacturer record.',
    url: 'https://developer.volvopenta.com/volvopenta/ext/product',
    accent: 'blue',
  },
  {
    name: 'SinoAuto360',
    category: 'VIN-aware search',
    description: 'Look up vehicle parts using VIN or vehicle context and return pricing and stock information.',
    use: 'Check that a recommended part matches the vehicle or asset.',
    url: 'https://sinoauto360.com/spare-parts',
    accent: 'green',
  },
  {
    name: 'Automa.Net',
    category: 'Global availability',
    description: 'Compare real-time availability, pricing, and supplier details using manufacturer and part number.',
    use: 'Compare suppliers and select the fastest available replacement.',
    url: 'https://help.automa.net/article/global-availability/',
    accent: 'purple',
  },
  {
    name: 'Konecranes Spare Parts',
    category: 'Ordering workflow',
    description: 'Browse spare-parts catalogs, build carts, place orders, and check delivery status.',
    use: 'Move from an approved maintenance recommendation to procurement.',
    url: 'https://developer.konecranes.com/product-spare-parts-data',
    accent: 'cyan',
  },
]

const workflow = [
  ['01', 'Identify', 'Resolve the component using the part number, asset, VIN, or manufacturer catalog.'],
  ['02', 'Compare', 'Check compatible replacements, supplier stock, price, and estimated delivery.'],
  ['03', 'Approve', 'Let a supervisor review the recommendation before procurement.'],
  ['04', 'Track', 'Follow the purchase request and delivery from the same workspace.'],
]

export default function PartsAvailabilityPage() {
  const [query, setQuery] = useState('')
  const filteredIntegrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return integrations
    return integrations.filter((item) => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(normalizedQuery))
  }, [query])

  return (
    <section className="parts-page">
      <div className="parts-heading">
        <div>
          <p className="eyebrow">External intelligence hub</p>
          <h1>Parts &amp; Availability</h1>
          <p className="muted">Connect MachineX to catalogs, supplier networks, and ordering systems.</p>
        </div>
        <div className="parts-status"><span className="status-dot" /> Connections managed securely</div>
      </div>

      <div className="parts-hero panel">
        <div className="parts-hero-icon"><Boxes size={25} /></div>
        <div>
          <p className="eyebrow">Inspection-to-supply workflow</p>
          <h2>Turn a detected component into an actionable parts decision.</h2>
          <p className="muted">MachineX can use these providers independently: identify the right component, verify compatibility, compare supply, and hand off an approved order.</p>
        </div>
        <div className="parts-hero-actions">
          <button type="button" className="primary-button" onClick={() => document.getElementById('integration-search')?.focus()}><Search size={15} /> Find a provider</button>
        </div>
      </div>

      <div className="parts-workflow">
        {workflow.map(([number, title, description], index) => (
          <div className="parts-workflow-step" key={number}>
            <span>{number}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
            {index < workflow.length - 1 && <ArrowUpRight className="parts-step-arrow" size={17} />}
          </div>
        ))}
      </div>

      <div className="parts-toolbar">
        <div>
          <p className="eyebrow">Integration directory</p>
          <h2>Choose the right source for your next parts decision</h2>
        </div>
        <label className="parts-search">
          <Search size={16} />
          <input id="integration-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers or capabilities" />
        </label>
      </div>

      <div className="parts-grid">
        {filteredIntegrations.map((integration) => (
          <article className={`parts-card ${integration.accent}`} key={integration.name}>
            <div className="parts-card-top">
              <div className="parts-card-icon"><Globe2 size={19} /></div>
              <span className="parts-category">{integration.category}</span>
              <span className="parts-connection"><CheckCircle2 size={13} /> API-ready</span>
            </div>
            <h2>{integration.name}</h2>
            <p>{integration.description}</p>
            <div className="parts-use"><Wrench size={14} /><span>{integration.use}</span></div>
            <a className="parts-doc-link" href={integration.url} target="_blank" rel="noreferrer">
              View documentation <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>

      {!filteredIntegrations.length && <div className="empty-state"><Search size={22} /><p>No integrations match “{query}”.</p></div>}

      <div className="parts-guardrail panel">
        <ShoppingCart size={20} />
        <div><strong>Human approval stays in the loop</strong><p className="muted">MachineX can recommend and compare parts, but an operator should approve compatibility and purchasing before an order is placed.</p></div>
      </div>
    </section>
  )
}
