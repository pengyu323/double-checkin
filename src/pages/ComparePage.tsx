import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = []
  const startPad = first.getDay()
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month - 2, last.getDate() - startPad + i + 1)
    days.push({
      date: d.toISOString().slice(0, 10),
      day: d.getDate(),
      isCurrentMonth: false,
    })
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      isCurrentMonth: true,
    })
  }
  const rest = 42 - days.length
  for (let i = 1; i <= rest; i++) {
    const d = new Date(year, month, i)
    days.push({
      date: d.toISOString().slice(0, 10),
      day: d.getDate(),
      isCurrentMonth: false,
    })
  }
  return days
}

export default function ComparePage() {
  const { user, partner, checkIns, ratings } = useApp()
  const [tab, setTab] = useState<'mine' | 'compare'>('mine')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date()
    return { year: t.getFullYear(), month: t.getMonth() + 1 }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const myCheckIns = useMemo(() => {
    if (!user) return []
    return checkIns.filter((c) => c.userId === user.id)
  }, [user, checkIns])

  const partnerCheckIns = useMemo(() => {
    if (!partner) return []
    return checkIns.filter((c) => c.userId === partner.partnerId)
  }, [partner, checkIns])

  const myDates = useMemo(() => new Set(myCheckIns.map((c) => c.date)), [myCheckIns])

  const days = useMemo(
    () => getDaysInMonth(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month]
  )

  const selectedCheckIn = selectedDate
    ? myCheckIns.find((c) => c.date === selectedDate)
    : null

  const myRatingsReceived = useMemo(() => {
    if (!user) return []
    return ratings.filter((r) => r.toUserId === user.id)
  }, [user, ratings])
  const avgCompleteness = useMemo(() => {
    if (myRatingsReceived.length === 0) return 0
    return myRatingsReceived.reduce((a, r) => a + r.completeness, 0) / myRatingsReceived.length
  }, [myRatingsReceived])
  const avgEffort = useMemo(() => {
    if (myRatingsReceived.length === 0) return 0
    return myRatingsReceived.reduce((a, r) => a + r.effort, 0) / myRatingsReceived.length
  }, [myRatingsReceived])

  const thisMonthStr = `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}`
  const thisMonthCount = myCheckIns.filter((c) => c.date.startsWith(thisMonthStr)).length
  const firstWeight = myCheckIns.length ? myCheckIns[myCheckIns.length - 1].weight : null
  const lastWeight = myCheckIns.length ? myCheckIns[0].weight : null
  const totalLost = firstWeight != null && lastWeight != null ? firstWeight - lastWeight : 0

  if (!user) return null

  return (
    <div className="app-page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab('mine')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            background: tab === 'mine' ? 'var(--primary)' : 'var(--bg)',
            color: tab === 'mine' ? '#fff' : 'var(--text)',
            fontWeight: 500,
          }}
        >
          我的记录
        </button>
        <button
          onClick={() => setTab('compare')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            background: tab === 'compare' ? 'var(--primary)' : 'var(--bg)',
            color: tab === 'compare' ? '#fff' : 'var(--text)',
            fontWeight: 500,
          }}
        >
          双方对比
        </button>
      </div>

      {tab === 'mine' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>打卡日历</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {calendarMonth.year}年{calendarMonth.month}月
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 12 }}>
              {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                <div key={w} style={{ color: 'var(--text-muted)' }}>{w}</div>
              ))}
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  style={{
                    padding: '8px 0',
                    borderRadius: 8,
                    background: selectedDate === d.date ? 'var(--primary)' : myDates.has(d.date) ? 'rgba(126, 211, 33, 0.3)' : 'transparent',
                    color: selectedDate === d.date ? '#fff' : d.isCurrentMonth ? 'var(--text)' : 'var(--text-muted)',
                    opacity: d.isCurrentMonth ? 1 : 0.5,
                  }}
                >
                  {d.day}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
              <button
                type="button"
                onClick={() => setCalendarMonth((m) => (m.month === 1 ? { year: m.year - 1, month: 12 } : { ...m, month: m.month - 1 }))}
              >
                上月
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth((m) => (m.month === 12 ? { year: m.year + 1, month: 1 } : { ...m, month: m.month + 1 }))}
              >
                下月
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>本月打卡</span>
              <strong>{thisMonthCount} 天</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>累计减重</span>
              <strong>{totalLost > 0 ? `-${totalLost.toFixed(1)} kg` : totalLost < 0 ? `+${(-totalLost).toFixed(1)} kg` : '-'}</strong>
            </div>
          </div>

          {selectedDate && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>{selectedDate} 详情</span>
                <button type="button" onClick={() => setSelectedDate(null)}>关闭</button>
              </div>
              {selectedCheckIn ? (
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  {selectedCheckIn.weight != null && <p>体重: {selectedCheckIn.weight} kg</p>}
                  {selectedCheckIn.sportType && <p>运动: {selectedCheckIn.sportType} {selectedCheckIn.sportMinutes}分钟</p>}
                  {selectedCheckIn.waterCups != null && <p>饮水: {selectedCheckIn.waterCups} 杯</p>}
                  {selectedCheckIn.sleepHours != null && <p>睡眠: {selectedCheckIn.sleepHours} 小时</p>}
                  {selectedCheckIn.mood && <p>心情: {selectedCheckIn.mood}</p>}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>当日未打卡</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'compare' && partner && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 4px',
                  fontWeight: 600,
                }}
              >
                {user.nickname.slice(0, 1)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user.nickname}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>本周 {myCheckIns.filter((c) => {
                const d = new Date(c.date)
                const now = new Date()
                const weekStart = new Date(now)
                weekStart.setDate(now.getDate() - now.getDay())
                return d >= weekStart
              }).length} 次</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 4px',
                  fontWeight: 600,
                }}
              >
                {partner.partnerNickname.slice(0, 1)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{partner.partnerNickname}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>本周 {partnerCheckIns.filter((c) => {
                const d = new Date(c.date)
                const now = new Date()
                const weekStart = new Date(now)
                weekStart.setDate(now.getDate() - now.getDay())
                return d >= weekStart
              }).length} 次</div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 8 }}>我的评分趋势（收到）</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>完成度均分</span>
              <strong>{avgCompleteness.toFixed(1)} 星</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>努力度均分</span>
              <strong>{avgEffort.toFixed(1)} 星</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
