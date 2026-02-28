import { useApp } from '../context/AppContext'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

const ACHIEVEMENTS = [
  { id: '7days', name: '连续打卡7天', desc: '坚持一周', icon: '🔥' },
  { id: '30days', name: '连续打卡30天', desc: '坚持一月', icon: '⭐' },
  { id: '100days', name: '连续打卡100天', desc: '百日坚持', icon: '🏆' },
  { id: 'best_partner', name: '最佳拍档', desc: '互评高分周/月', icon: '👫' },
]

export default function AchievementsPage() {
  const { user, checkIns, ratings } = useApp()

  const myCheckIns = useMemo(() => {
    if (!user) return []
    return checkIns.filter((c) => c.userId === user.id).sort((a, b) => b.date.localeCompare(a.date))
  }, [user, checkIns])

  const receivedRatings = useMemo(() => ratings.filter((r) => r.toUserId === user?.id), [user, ratings])
  const avgScore = useMemo(() => {
    if (receivedRatings.length === 0) return 0
    const sum = receivedRatings.reduce((a, r) => a + r.completeness + r.effort, 0)
    return sum / (receivedRatings.length * 2)
  }, [receivedRatings])

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
    if (receivedRatings.length >= 7 && avgScore >= 4) ids.push('best_partner')
    return ids
  }, [consecutiveDays, receivedRatings.length, avgScore])

  if (!user) return null

  return (
    <div className="app-page">
      <div style={{ marginBottom: 16 }}>
        <Link to="/profile" style={{ fontSize: 14, color: 'var(--primary)' }}>← 返回个人中心</Link>
      </div>
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>成就墙</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 16,
                borderRadius: 12,
                background: unlockedIds.includes(a.id) ? 'rgba(245, 166, 35, 0.2)' : 'var(--bg)',
                opacity: unlockedIds.includes(a.id) ? 1 : 0.65,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.desc}</div>
              {unlockedIds.includes(a.id) ? (
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8 }}>已解锁</div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>未解锁</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
