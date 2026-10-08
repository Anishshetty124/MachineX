import { useEffect, useState } from 'react'
import { ShieldCheck, UserCog } from 'lucide-react'
import { authFetch } from '../auth'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    authFetch('/api/users')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Unable to load users')
        setUsers(payload.data || [])
      })
      .catch((loadError) => setError(loadError.message))
  }, [])

  const changeRole = async (id, role) => {
    const response = await authFetch(`/api/users/${id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    const payload = await response.json()
    if (!response.ok) return setError(payload.error || 'Unable to change role')
    setUsers((current) => current.map((user) => user._id === id ? payload.data : user))
  }

  return <section className="admin-page"><div className="history-heading"><div><p className="eyebrow">Administration</p><h1>User access</h1><p className="muted">Manage accounts and promote trusted users from MongoDB-backed roles.</p></div><ShieldCheck size={32} color="var(--accent)" /></div>{error && <div className="history-error">{error}</div>}<div className="admin-list panel">{users.map((user) => <div className="admin-row" key={user._id}><UserCog size={18} /><div><strong>{user.name}</strong><small>{user.email} · {user.phone}</small></div><select value={user.role} onChange={(event) => changeRole(user._id, event.target.value)}><option value="operator">Operator</option><option value="quality_manager">Quality manager</option><option value="admin">Admin</option></select></div>)}</div></section>
}
