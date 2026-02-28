import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function LoginPage() {
  const { login, supabaseMode } = useApp()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const name = nickname.trim() || '用户'
    setLoading(true)
    try {
      const result = await login(name)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-page" style={{ justifyContent: 'center', display: 'flex', flexDirection: 'column', maxWidth: 320, margin: '0 auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: 8, fontSize: 22 }}>双人减肥打卡</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          与伙伴互相监督，每日打卡、互评，一起坚持。
          {supabaseMode && <span style={{ display: 'block', marginTop: 8 }}>已启用云端，可与异地好友绑定。</span>}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-row">
            <label>昵称</label>
            <input
              type="text"
              placeholder="输入昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 8 }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={loading}>
            {loading ? '进入中…' : '进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
