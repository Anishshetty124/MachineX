import { createContext, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Bell, CarFront, CircleHelp, LayoutDashboard, Menu, X } from 'lucide-react'
import { io } from 'socket.io-client'
import InspectionPage from './pages/InspectionPage'
import UserGuideModal from './components/UserGuideModal'
import './App.css'

const SocketContext = createContext(null)

function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const connection = io(import.meta.env.VITE_API_URL ?? 'http://localhost:5000', { autoConnect: false })
    connection.on('connect', () => setSocket(connection))
    connection.on('disconnect', () => setSocket(null))
    connection.connect()
    return () => connection.disconnect()
  }, [])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

function Dashboard({ demoKey }) {
  return (
    <InspectionPage key={demoKey} demoRequested={demoKey > 0} />
  )
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(() => !window.localStorage.getItem('autoqual-guide-seen'))
  const [demoKey, setDemoKey] = useState(0)
  const navigation = [['/', 'Overview', LayoutDashboard]]
  const openGuide = () => { setGuideOpen(true); window.localStorage.setItem('autoqual-guide-seen', 'true') }

  return (
    <BrowserRouter><SocketProvider><div className="app-shell"><aside className={drawerOpen ? 'sidebar open' : 'sidebar'}><div className="brand"><CarFront size={24} /><span>AUTO-QUAL <b>AI</b></span><button className="icon-button mobile-only" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={20} /></button></div><p className="nav-label">Workspace</p><nav>{navigation.map(([path, label, Icon]) => <NavLink key={path} to={path} onClick={() => setDrawerOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} />{label}</NavLink>)}</nav><div className="sidebar-footer"><div className="operator"><span>OP</span><div><strong>Operator</strong><small>Quality control</small></div></div></div></aside><div className="main-column"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={22} /></button><span className="topbar-title">Plant 01 / Main floor</span><div className="topbar-actions"><button className="guide-button" onClick={openGuide}><CircleHelp size={16} />How to use</button><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button><span className="avatar">OP</span></div></header><main><AnimatePresence>{drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}</AnimatePresence><Routes><Route path="/" element={<Dashboard demoKey={demoKey} />} /></Routes></main></div><UserGuideModal open={guideOpen} onClose={() => { setGuideOpen(false); window.localStorage.setItem('autoqual-guide-seen', 'true') }} onDemo={() => { setDemoKey((value) => value + 1); window.localStorage.setItem('autoqual-guide-seen', 'true') }} /></div></SocketProvider></BrowserRouter>
  )
}

export default App
