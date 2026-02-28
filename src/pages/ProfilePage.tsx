import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useMemo } from 'react'

const ACHIEVEMENTS = [
  { id: '7days', name: '连续打卡7天', desc: '坚持一周', icon: '🔥' },
  { id: '30days', name: '连续打卡30天', desc: '坚持一月', icon: '⭐' },
  { id: '100days', name: '连续打卡100天', desc: '百日坚持', icon: '🏆' },
  { id: 'best_partner', name: '最佳拍档', desc: '互评高分周/月', icon: '👫' },
]

export default function ProfilePage() {
  const { user, partner, checkIns, ratings, unbindPartner } = useApp()

  const myCheckIns = useMemo(() => {
    if (!user) return []
    return checkIns.filter((c) => c.userId === user.id).sort((a, b) => b.date.localeCompare(a.date))
  }, [user, checkIns])

  const totalDays = myCheckIns.length
  const receivedRatings = useMemo(() => ratings.filter((r) => r.toUserId === user?.id), [user, ratings])
  const avgScore = useMemo(() => {
    if (receivedRatings.length === 0) return 0
    const sum = receivedRatings.reduce((a, r) => a + r.completeness + r.effort, 0)
    return (sum / (receivedRatings.length * 2)).toFixed(1)
  }, [receivedRatings])

  const firstWeight = myCheckIns.length ? myCheckIns[myCheckIns.length - 1].weight : null
  const lastWeight = myCheckIns.length ? myCheckIns[0].weight : null
  const totalLost = firstWeight != null && lastWeight != null ? firstWeight - lastWeight : 0

  const consecutiveDays = useMemo(() => {
    if (myCheckIns.length === 0) return 0
    let count = 0
    const today = new Date().toISOString().slice(0, 10)
    const set = new Set(myCheckIns.map((c) => c.date))
    for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
      const ds = d.toISOString().slice(0, 10)
      if (!set.has(ds)) break
      count++
    }
    return count
  }, [myCheckIns])

  const unlockedIds = useMemo(() => {
    const ids: string[] = []
    if (consecutiveDays >= 7) ids.push('7days')
    if (consecutiveDays >= 30) ids.push('30days')
    if (consecutiveDays >= 100) ids.push('100days')
    if (receivedRatings.length >= 7 && Number(avgScore) >= 4) ids.push('best_partner')
    return ids
  }, [consecutiveDays, receivedRatings.length, avgScore])

  if (!user) return null

  return (
    <div className="app-page">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {user.nickname.slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{user.nickname}</div>
            {partner ? (
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                已与 {partner.partnerNickname} 绑定 · 邀请码 {user.inviteCode}
              </div>
            ) : (
              <Link to="/bind" style={{ fontSize: 14 }}>邀请伙伴 / 加入伙伴</Link>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{totalDays}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>累计打卡</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{avgScore}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>平均评分</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{totalLost > 0 ? `-${totalLost.toFixed(1)}` : totalLost < 0 ? `+${(-totalLost).toFixed(1)}` : '0'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>减重(kg)</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>功能入口</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/compare" className="input-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span>我的打卡日历</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </Link>
          <Link to="/compare" className="input-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span>体重趋势</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </Link>
          <Link to="/message" className="input-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span>评分趋势</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </Link>
          <Link to="/achievements" className="input-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span>成就墙</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </Link>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>成就墙</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 12,
                borderRadius: 8,
                background: unlockedIds.includes(a.id) ? 'rgba(245, 166, 35, 0.15)' : 'var(--bg)',
                opacity: unlockedIds.includes(a.id) ? 1 : 0.6,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontWeight: 500 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
              {unlockedIds.includes(a.id) && (
                <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>已解锁</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>设置</div>
        {partner && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('确定解除与伙伴的绑定？')) return
              await unbindPartner()
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 0',
              textAlign: 'left',
              color: 'var(--danger)',
            }}
          >
            解绑伙伴
          </button>
        )}
        <Link to="/bind" style={{ display: 'block', padding: '12px 0', color: 'var(--text)' }}>
          {partner ? '更换伙伴' : '邀请伙伴'}
        </Link>
      </div>
    </div>
  )
}
