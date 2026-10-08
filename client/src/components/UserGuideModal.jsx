import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, CircleHelp, Download, Gauge, ImagePlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const steps = [
  { title: 'Capture the evidence', description: 'Upload a brake-pad photo or capture one directly from the inspection station. Add the machine telemetry and part details alongside it.', icon: ImagePlus },
  { title: 'See the defect in space', description: 'AUTO-QUAL places the optical bounding box on an interactive 3D brake assembly so you can inspect the exact surface location.', icon: Camera },
  { title: 'Trace the root cause', description: 'Compare sensor drivers, machine conditions, and failure risk before deciding whether the part can continue through the line.', icon: Gauge },
  { title: 'Act with the AI Copilot', description: 'Ask follow-up questions, generate a maintenance work order, and export the inspection record for your team.', icon: Download },
]

export default function UserGuideModal({ open, onClose, onDemo }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const current = steps[step]
  const Icon = current.icon

  return <AnimatePresence>{open && <motion.div className="guide-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section role="dialog" aria-modal="true" aria-labelledby="guide-title" className="guide-modal" initial={{ opacity: 0, y: 22, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}><button className="guide-close icon-button" onClick={onClose} aria-label="Close guide"><X size={20} /></button><div className="guide-visual"><div className="guide-orbit" /><Icon size={40} /><span>0{step + 1} / 04</span></div><div className="guide-copy"><p className="eyebrow">AUTO-QUAL AI / getting started</p><h2 id="guide-title">{current.title}</h2><p className="muted">{current.description}</p><div className="guide-progress">{steps.map((item, index) => <button key={item.title} className={index === step ? 'guide-dot active' : 'guide-dot'} onClick={() => setStep(index)} aria-label={`Go to step ${index + 1}`}>{index === step ? <CheckCircle2 size={16} /> : <span>{index + 1}</span>}</button>)}</div><div className="guide-actions"><button className="secondary-button" onClick={step === 0 ? onClose : () => setStep(step - 1)}><ArrowLeft size={15} />{step === 0 ? 'Skip guide' : 'Back'}</button>{step === steps.length - 1 ? <button className="primary-button" onClick={() => { onDemo(); onClose() }}>Try sample demo <CheckCircle2 size={15} /></button> : <button className="primary-button" onClick={() => setStep(step + 1)}>Next <ArrowRight size={15} /></button>}</div></div></motion.section></motion.div>}</AnimatePresence>
}