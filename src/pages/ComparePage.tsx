import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

/** 本周一 00:00 对应的日期字符串（按中国周一到周日） */
function getThisWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  return mon.toISOString().slice(0, 10)
}

/** 本周内是否包含某日期 */
function isDateInThisWeek(dateStr: string, weekStart: string): boolean {
  const start = new Date(weekStart)
  const d = new Date(dateStr)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return d >= start && d <= end
}

/** 近 7 天的日期字符串（从新到旧） */
function getLast7Days(): string[] {
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** 近 N 天的日期字符串（从新到旧） */
function getLastNDays(n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

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
  const { user, partner, checkIns, ratings, sendEncourageToPartner } = useApp()
  const [tab, setTab] = useState<'mine' | 'compare'>('mine')
  const [encourageSent, setEncourageSent] = useState<string | null>(null)
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
  const partnerRatingsReceived = useMemo(() => {
    if (!partner) return []
    return ratings.filter((r) => r.toUserId === partner.partnerId)
  }, [partner, ratings])
  const avgCompleteness = useMemo(() => {
    if (myRatingsReceived.length === 0) return 0
    return myRatingsReceived.reduce((a, r) => a + r.completeness, 0) / myRatingsReceived.length
  }, [myRatingsReceived])
  const avgEffort = useMemo(() => {
    if (myRatingsReceived.length === 0) return 0
    return myRatingsReceived.reduce((a, r) => a + r.effort, 0) / myRatingsReceived.length
  }, [myRatingsReceived])
  const partnerAvgCompleteness = useMemo(() => {
    if (partnerRatingsReceived.length === 0) return 0
    return partnerRatingsReceived.reduce((a, r) => a + r.completeness, 0) / partnerRatingsReceived.length
  }, [partnerRatingsReceived])
  const partnerAvgEffort = useMemo(() => {
    if (partnerRatingsReceived.length === 0) return 0
    return partnerRatingsReceived.reduce((a, r) => a + r.effort, 0) / partnerRatingsReceived.length
  }, [partnerRatingsReceived])

  const weekStart = useMemo(() => getThisWeekStart(), [])
  const thisWeekMyCount = useMemo(
    () => myCheckIns.filter((c) => isDateInThisWeek(c.date, weekStart)).length,
    [myCheckIns, weekStart]
  )
  const thisWeekPartnerCount = useMemo(
    () => partnerCheckIns.filter((c) => isDateInThisWeek(c.date, weekStart)).length,
    [partnerCheckIns, weekStart]
  )
  const last7Days = useMemo(() => getLast7Days(), [])
  const last14Days = useMemo(() => getLastNDays(14), [])
  const thisWeekMySportMinutes = useMemo(
    () => myCheckIns.filter((c) => isDateInThisWeek(c.date, weekStart)).reduce((sum, c) => sum + (c.sportMinutes ?? 0), 0),
    [myCheckIns, weekStart]
  )
  const thisWeekPartnerSportMinutes = useMemo(
    () => partnerCheckIns.filter((c) => isDateInThisWeek(c.date, weekStart)).reduce((sum, c) => sum + (c.sportMinutes ?? 0), 0),
    [partnerCheckIns, weekStart]
  )
  const myWeightsLast14 = useMemo(
    () => last14Days.map((d) => myCheckIns.find((c) => c.date === d)?.weight).filter((w): w is number => w != null),
    [last14Days, myCheckIns]
  )
  const partnerWeightsLast14 = useMemo(
    () => last14Days.map((d) => partnerCheckIns.find((c) => c.date === d)?.weight).filter((w): w is number => w != null),
    [last14Days, partnerCheckIns]
  )
  const myWeightTrend = useMemo(() => {
    if (myWeightsLast14.length < 2) return null
    const first = myWeightsLast14[myWeightsLast14.length - 1]
    const last = myWeightsLast14[0]
    return { first, last, diff: first - last }
  }, [myWeightsLast14])
  const partnerWeightTrend = useMemo(() => {
    if (partnerWeightsLast14.length < 2) return null
    const first = partnerWeightsLast14[partnerWeightsLast14.length - 1]
    const last = partnerWeightsLast14[0]
    return { first, last, diff: first - last }
  }, [partnerWeightsLast14])
  const thisWeekDates = useMemo(() => {
    const start = new Date(weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [weekStart])
  const myMealComplete = useMemo(() => {
    let filled = 0
    let total = 0
    thisWeekDates.forEach((d) => {
      const c = myCheckIns.find((x) => x.date === d)
      if (c) {
        total += 3
        if (c.breakfast) filled += 1
        if (c.lunch) filled += 1
        if (c.dinner) filled += 1
      }
    })
    return total > 0 ? Math.round((filled / total) * 100) : 0
  }, [myCheckIns, thisWeekDates])
  const partnerMealComplete = useMemo(() => {
    let filled = 0
    let total = 0
    thisWeekDates.forEach((d) => {
      const c = partnerCheckIns.find((x) => x.date === d)
      if (c) {
        total += 3
        if (c.breakfast) filled += 1
        if (c.lunch) filled += 1
        if (c.dinner) filled += 1
      }
    })
    return total > 0 ? Math.round((filled / total) * 100) : 0
  }, [partnerCheckIns, thisWeekDates])

  const last4WeeksStart = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < 4; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() - i * 7)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  }, [weekStart])
  const last4WeeksStats = useMemo(() => {
    return last4WeeksStart.map((start) => {
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const endStr = end.toISOString().slice(0, 10)
      const myInWeek = myCheckIns.filter((c) => c.date >= start && c.date <= endStr)
      const partnerInWeek = partnerCheckIns.filter((c) => c.date >= start && c.date <= endStr)
      const myFirstW = myInWeek.length ? myInWeek.reduce((a, c) => (c.date < a.date ? c : a)).weight : null
      const myLastW = myInWeek.length ? myInWeek.reduce((a, c) => (c.date > a.date ? c : a)).weight : null
      const partnerFirstW = partnerInWeek.length ? partnerInWeek.reduce((a, c) => (c.date < a.date ? c : a)).weight : null
      const partnerLastW = partnerInWeek.length ? partnerInWeek.reduce((a, c) => (c.date > a.date ? c : a)).weight : null
      return {
        start,
        end: endStr,
        label: `${start.slice(5)}～${endStr.slice(5)}`,
        myCount: myInWeek.length,
        partnerCount: partnerInWeek.length,
        myLost: myFirstW != null && myLastW != null ? myFirstW - myLastW : null,
        partnerLost: partnerFirstW != null && partnerLastW != null ? partnerFirstW - partnerLastW : null,
      }
    })
  }, [last4WeeksStart, myCheckIns, partnerCheckIns])
  const myCurrentWeight = myCheckIns[0]?.weight
  const partnerCurrentWeight = partnerCheckIns[0]?.weight
  const myWeekFirstWeight = myCheckIns.find((c) => isDateInThisWeek(c.date, weekStart))?.weight ?? myCurrentWeight
  const partnerWeekFirstWeight =
    partnerCheckIns.find((c) => isDateInThisWeek(c.date, weekStart))?.weight ?? partnerCurrentWeight
  const myWeekLost =
    myWeekFirstWeight != null && myCurrentWeight != null ? myWeekFirstWeight - myCurrentWeight : 0
  const partnerWeekLost =
    partnerWeekFirstWeight != null && partnerCurrentWeight != null
      ? partnerWeekFirstWeight - partnerCurrentWeight
      : 0

  const latestRatingFromPartner = useMemo(() => {
    if (!user || !partner) return null
    const list = ratings
      .filter((r) => r.fromUserId === partner.partnerId && r.toUserId === user.id)
      .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate))
    return list[0] ?? null
  }, [user, partner, ratings])

  const encouragingMsg = useMemo(() => {
    if (thisWeekMyCount > thisWeekPartnerCount) {
      const lead = thisWeekMyCount - thisWeekPartnerCount
      return `你已领先 ${lead} 天，继续加油！`
    }
    if (thisWeekPartnerCount === 0 && thisWeekMyCount === 0) return '本周一起开始打卡吧～'
    if (thisWeekPartnerCount === 0) return `${partner?.partnerNickname ?? '伙伴'}本周还没打卡，快去提醒 TA`
    if (thisWeekMyCount === 0) return '本周你还没打卡，今天就开始吧！'
    if (thisWeekMyCount < thisWeekPartnerCount) return '再打几天就能追上啦，加油！'
    return '势均力敌，继续保持！'
  }, [thisWeekMyCount, thisWeekPartnerCount, partner?.partnerNickname])

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
        <>
          {/* 头部：双人头像 + 本周PK柱状图 + 鼓励语 */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(126,211,33,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                    fontWeight: 600,
                    fontSize: 20,
                  }}
                >
                  {user.nickname.slice(0, 1)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{user.nickname}</div>
              </div>
              <div style={{ flex: 1, maxWidth: 140, padding: '0 12px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>
                  你 {thisWeekMyCount} 次 vs {partner.partnerNickname} {thisWeekPartnerCount} 次
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 40 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        height: Math.max(8, (thisWeekMyCount / 7) * 32),
                        maxHeight: 32,
                        background: 'var(--primary)',
                        borderRadius: 6,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>我</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        height: Math.max(8, (thisWeekPartnerCount / 7) * 32),
                        maxHeight: 32,
                        background: 'var(--secondary)',
                        borderRadius: 6,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>TA</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #5eb8e6, #3a9fd5)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                    fontWeight: 600,
                    fontSize: 20,
                  }}
                >
                  {partner.partnerNickname.slice(0, 1)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{partner.partnerNickname}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--primary)', fontWeight: 500 }}>
              {encouragingMsg}
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['你的运动量太强了！', '坚持得真好～', '一起加油！', '今天也很棒！', '给你点赞 👍'].map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={async () => {
                    const res = await sendEncourageToPartner(text)
                    if (res && 'ok' in res) {
                      setEncourageSent(text)
                      setTimeout(() => setEncourageSent(null), 2000)
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 20,
                    background: encourageSent === text ? 'var(--secondary)' : 'var(--bg)',
                    color: encourageSent === text ? '#fff' : 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {encourageSent === text ? '已发送' : text}
                </button>
              ))}
            </div>
          </div>

          {/* 核心指标卡片：两人并列 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>我的数据</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>体重变化</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{myCurrentWeight != null ? `${myCurrentWeight} kg` : '-'}</div>
                <div style={{ fontSize: 12, color: myWeekLost > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                  {myWeekLost > 0 ? `本周 ↓${myWeekLost.toFixed(1)} kg` : '本周持平'}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>本周打卡</div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(thisWeekMyCount / 7) * 100}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{thisWeekMyCount}/7 天</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>收到均分</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>完成 {avgCompleteness.toFixed(1)}★</span>
                  <span style={{ fontSize: 14 }}>努力 {avgEffort.toFixed(1)}★</span>
                </div>
              </div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #5eb8e6' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{partner.partnerNickname}</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>体重变化</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{partnerCurrentWeight != null ? `${partnerCurrentWeight} kg` : '-'}</div>
                <div style={{ fontSize: 12, color: partnerWeekLost > 0 ? '#3a9fd5' : 'var(--text-muted)' }}>
                  {partnerWeekLost > 0 ? `本周 ↓${partnerWeekLost.toFixed(1)} kg` : '本周持平'}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>本周打卡</div>
                <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(thisWeekPartnerCount / 7) * 100}%`,
                      height: '100%',
                      background: '#5eb8e6',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{thisWeekPartnerCount}/7 天</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>收到均分</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>完成 {partnerAvgCompleteness.toFixed(1)}★</span>
                  <span style={{ fontSize: 14 }}>努力 {partnerAvgEffort.toFixed(1)}★</span>
                </div>
              </div>
            </div>
          </div>

          {/* 运动时长对比：本周总运动分钟 */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>本周运动时长</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 44 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(8, Math.min(36, (thisWeekMySportMinutes / 120) * 36)),
                    background: 'var(--primary)',
                    borderRadius: 6,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>我 {thisWeekMySportMinutes} 分钟</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(8, Math.min(36, (thisWeekPartnerSportMinutes / 120) * 36)),
                    background: '#5eb8e6',
                    borderRadius: 6,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{partner.partnerNickname} {thisWeekPartnerSportMinutes} 分钟</span>
              </div>
            </div>
          </div>

          {/* 近 14 天体重趋势 */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>近 14 天体重趋势</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>我：</span>
                {myWeightTrend != null ? (
                  <span>{myWeightTrend.first.toFixed(1)} → {myWeightTrend.last.toFixed(1)} kg {myWeightTrend.diff > 0 ? `↓${myWeightTrend.diff.toFixed(1)}` : myWeightTrend.diff < 0 ? `↑${(-myWeightTrend.diff).toFixed(1)}` : '持平'}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>数据不足</span>
                )}
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{partner.partnerNickname}：</span>
                {partnerWeightTrend != null ? (
                  <span>{partnerWeightTrend.first.toFixed(1)} → {partnerWeightTrend.last.toFixed(1)} kg {partnerWeightTrend.diff > 0 ? `↓${partnerWeightTrend.diff.toFixed(1)}` : partnerWeightTrend.diff < 0 ? `↑${(-partnerWeightTrend.diff).toFixed(1)}` : '持平'}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>数据不足</span>
                )}
              </div>
            </div>
          </div>

          {/* 饮食打卡完整性 */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>本周饮食打卡完整度</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>我</div>
                <div style={{ height: 10, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${myMealComplete}%`, height: '100%', background: 'var(--primary)', borderRadius: 5, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{myMealComplete}%</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{partner.partnerNickname}</div>
                <div style={{ height: 10, background: 'var(--bg)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${partnerMealComplete}%`, height: '100%', background: '#5eb8e6', borderRadius: 5, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{partnerMealComplete}%</span>
              </div>
            </div>
          </div>

          {/* 评分趋势：近 7 天两人收到的评分 */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>评分趋势（近 7 天收到）</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {last7Days.slice().reverse().map((d) => {
                const myR = myRatingsReceived.find((r) => r.checkInDate === d)
                const pr = partnerRatingsReceived.find((r) => r.checkInDate === d)
                const myVal = myR ? (myR.completeness + myR.effort) / 2 : 0
                const pVal = pr ? (pr.completeness + pr.effort) / 2 : 0
                return (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 48 }}>
                      <div
                        style={{
                          width: 10,
                          height: myVal ? (myVal / 5) * 40 : 4,
                          minHeight: 4,
                          background: 'var(--primary)',
                          borderRadius: 4,
                        }}
                        title={`${d} 我 ${myVal.toFixed(1)}★`}
                      />
                      <div
                        style={{
                          width: 10,
                          height: pVal ? (pVal / 5) * 40 : 4,
                          minHeight: 4,
                          background: '#5eb8e6',
                          borderRadius: 4,
                        }}
                        title={`${d} TA ${pVal.toFixed(1)}★`}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.slice(5).replace('-', '/')}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--primary)', marginRight: 4 }} />我</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#5eb8e6', marginRight: 4 }} />{partner.partnerNickname}</span>
            </div>
          </div>

          {/* 最新互评展示 */}
          {latestRatingFromPartner && (
            <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>TA 给你的最新评价</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{latestRatingFromPartner.checkInDate}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span>完成度 {latestRatingFromPartner.completeness}★</span>
                <span>努力度 {latestRatingFromPartner.effort}★</span>
              </div>
              {latestRatingFromPartner.comment && (
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{`「${latestRatingFromPartner.comment}」`}</div>
              )}
            </div>
          )}

          {/* 近 4 周历史概览 */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>近 4 周概览</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>每周：打卡天数 · 当周体重变化</div>
            {last4WeeksStats.map((w) => (
              <div
                key={w.start}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{w.label}</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span>我 {w.myCount} 天 {w.myLost != null ? (w.myLost > 0 ? `↓${w.myLost.toFixed(1)}` : w.myLost < 0 ? `↑${(-w.myLost).toFixed(1)}` : '持平') : '-'}</span>
                  <span>{partner?.partnerNickname} {w.partnerCount} 天 {w.partnerLost != null ? (w.partnerLost > 0 ? `↓${w.partnerLost.toFixed(1)}` : w.partnerLost < 0 ? `↑${(-w.partnerLost).toFixed(1)}` : '持平') : '-'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 历史对比入口 */}
          <button
            type="button"
            onClick={() => setTab('mine')}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontWeight: 500,
              border: '1px solid var(--border)',
            }}
          >
            查看历史对比（打卡日历与累计数据）
          </button>
        </>
      )}

      {tab === 'compare' && !partner && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          <div style={{ marginBottom: 8 }}>暂无伙伴</div>
          <div style={{ fontSize: 14 }}>绑定伙伴后即可在这里查看双方对比</div>
        </div>
      )}
    </div>
  )
}
