import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function BindPage() {
  const { user, partner, bindPartner, bindByInviteCode, supabaseMode } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'invite' | 'join'>('choose')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  if (partner) {
    return (
      <div className="app-page">
        <div className="card">
          <p>您已与 <strong>{partner.partnerNickname}</strong> 绑定。</p>
          <button type="button" className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/profile')}>
            返回个人中心
          </button>
        </div>
      </div>
    )
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setJoinError('请输入邀请码')
      return
    }
    const code = joinCode.trim().toUpperCase()
    if (code === user.inviteCode) {
      setJoinError('不能输入自己的邀请码')
      return
    }
    if (supabaseMode) {
      setJoinError('')
      setJoining(true)
      const result = await bindByInviteCode(code)
      setJoining(false)
      if ('error' in result) {
        setJoinError(result.error)
        return
      }
      navigate('/')
      return
    }
    const mockPartner = {
      partnerId: 'mock-' + code,
      partnerNickname: '伙伴',
      partnerAvatar: '',
      partnerInviteCode: code,
      boundAt: new Date().toISOString(),
    }
    bindPartner(mockPartner)
    navigate('/')
  }

  const handleInvite = () => {
    if (!supabaseMode) {
      const mockPartner = {
        partnerId: 'mock-new',
        partnerNickname: '新伙伴',
        partnerAvatar: '',
        partnerInviteCode: '',
        boundAt: new Date().toISOString(),
      }
      bindPartner(mockPartner)
      navigate('/')
    }
  }

  if (mode === 'choose') {
    return (
      <div className="app-page">
        <div className="card">
          <h2 style={{ marginBottom: 8, fontSize: 20 }}>绑定伙伴</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
            {supabaseMode
              ? '与异地好友互相监督：邀请对方用你的邀请码绑定，或输入对方的邀请码绑定。'
              : '与伙伴互相监督，一起打卡、互评，坚持减肥。（当前为本地演示）'}
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginBottom: 12 }}
            onClick={() => setMode('invite')}
          >
            邀请伙伴
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'var(--secondary)' }}
            onClick={() => setMode('join')}
          >
            加入伙伴
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'invite') {
    return (
      <div className="app-page">
        <div className="card">
          <h2 style={{ marginBottom: 8, fontSize: 20 }}>邀请伙伴</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
            {supabaseMode
              ? '将下方邀请码发给好友，让对方在 App 里点击「加入伙伴」并输入此邀请码，即可完成绑定。'
              : '将您的邀请码发给伙伴，或点击下方按钮模拟绑定。'}
          </p>
          <div className="card" style={{ background: 'var(--bg)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>您的邀请码</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>{user.inviteCode}</div>
          </div>
          {!supabaseMode && (
            <button type="button" className="btn-primary" onClick={handleInvite}>
              模拟伙伴已扫码绑定
            </button>
          )}
          <button type="button" style={{ marginTop: 12 }} onClick={() => setMode('choose')}>
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page">
      <div className="card">
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>加入伙伴</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
          {supabaseMode
            ? '输入好友的邀请码，即可与对方建立绑定关系，之后可互相查看打卡并评分。'
            : '输入伙伴的邀请码，发送请求后对方同意即可建立绑定。（当前为模拟）'}
        </p>
        <div className="input-row">
          <label>邀请码</label>
          <input
            type="text"
            placeholder="请输入对方的邀请码"
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
            disabled={joining}
          />
        </div>
        {joinError && <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 8 }}>{joinError}</p>}
        <button type="button" className="btn-primary" onClick={handleJoin} disabled={joining}>
          {joining ? '绑定中…' : supabaseMode ? '确认绑定' : '发送请求并模拟绑定'}
        </button>
        <button type="button" style={{ marginTop: 12 }} onClick={() => setMode('choose')}>
          返回
        </button>
      </div>
    </div>
  )
}
