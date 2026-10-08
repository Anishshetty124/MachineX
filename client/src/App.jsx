import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Bell, Bot, CarFront, CircleHelp, LayoutDashboard, LogOut, Menu, Activity, Boxes, History, ShieldCheck, X } from 'lucide-react'
import { io } from 'socket.io-client'
import InspectionPage from './pages/InspectionPage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import ChatbotPage from './pages/ChatbotPage'
import PartsAvailabilityPage from './pages/PartsAvailabilityPage'
import HistoryPage from './pages/HistoryPage'
import UserGuideModal from './components/UserGuideModal'
import AuthPage from './pages/AuthPage'
import AdminPage from './pages/AdminPage'
import { clearSession, getStoredUser } from './auth'
import { SocketContext } from './SocketContext'
import './App.css'

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
  return <InspectionPage key={demoKey} demoRequested={demoKey > 0} />
}

function ControlPlaceholder() {
  return (
    <div className="empty-state">
      <p className="eyebrow">Step 03 / execution</p>
      <h1>AI control and work orders</h1>
      <p className="muted">Corrective-action execution will be connected here.</p>
      <NavLink className="secondary-button" to="/diagnostics/latest">
        Back to diagnostics
      </NavLink>
    </div>
  )
}

function ProtectedApp({ user, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(() => !window.localStorage.getItem('autoqual-guide-seen'))
  const [demoKey, setDemoKey] = useState(0)
  const navigate = useNavigate()

  const navigation = [
    ['/', 'Overview', LayoutDashboard],
    ['/diagnostics/latest', 'Diagnostics', Activity],
    ['/chatbot', 'Assistant', Bot],
    ['/parts', 'Parts & availability', Boxes],
    ['/history', 'History', History],
    ...(user.role === 'admin' ? [['/admin', 'Admin', ShieldCheck]] : []),
  ]

  const logout = () => {
    clearSession()
    onLogout()
    navigate('/login')
  }

  return <SocketProvider>
    <div className="app-shell">
      <aside className={drawerOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><CarFront size={24} /><span>MachineX</span><button className="icon-button mobile-only" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <p className="nav-label">Workspace</p>
        <nav>{navigation.map(([path, label, Icon]) => <NavLink key={path} to={path} onClick={() => setDrawerOpen(false)} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><Icon size={18} />{label}</NavLink>)}</nav>
        <div className="sidebar-footer"><div className="operator"><span>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></div></div>
      </aside>
      <div className="main-column">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={22} /></button><span className="topbar-title">Plant 01 / Main floor</span><div className="topbar-actions"><button className="guide-button" onClick={() => setGuideOpen(true)}><CircleHelp size={16} />How to use</button><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button><button className="auth-logout-icon" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button><span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span></div></header>
        <main><AnimatePresence>{drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}</AnimatePresence><Routes><Route path="/" element={<Dashboard demoKey={demoKey} />} /><Route path="/diagnostics" element={<DiagnosticsPage />} /><Route path="/diagnostics/:id" element={<DiagnosticsPage />} /><Route path="/chatbot" element={<ChatbotPage />} /><Route path="/parts" element={<PartsAvailabilityPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} /><Route path="/control" element={<ControlPlaceholder />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main>
      </div>
      <UserGuideModal open={guideOpen} onClose={() => { setGuideOpen(false); window.localStorage.setItem('autoqual-guide-seen', 'true') }} onDemo={() => { setDemoKey((value) => value + 1); window.localStorage.setItem('autoqual-guide-seen', 'true') }} />
    </div>
  </SocketProvider>
}

function App() {
  const [user, setUser] = useState(getStoredUser)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage onAuthenticated={setUser} />} />
        <Route path="*" element={user ? <ProtectedApp user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App