import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { todayStr } from '../storage'
import { canRate, isRatingExpired } from '../storage'

export default function MessagePage() {
  const { user, partner, checkIns, ratings, messages, getRating, getPartnerCheckInForDate, submitRating, markMessageRead } = useApp()
  const today = todayStr()

  const yesterday = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const partnerYesterdayCheckIn = partner ? getPartnerCheckInForDate(yesterday) : null
  const hasRatedYesterday = partnerYesterdayCheckIn ? getRating(yesterday, partner.partnerId) : null
  const needRate = partner && partnerYesterdayCheckIn && !hasRatedYesterday && canRate(yesterday) && !isRatingExpired(yesterday)

  const [rateComplete, setRateComplete] = useState(3)
  const [rateEffort, setRateEffort] = useState(3)
  const [rateComment, setRateComment] = useState('')

  const handleSubmitRating = async () => {
    if (!partner || !partnerYesterdayCheckIn) return
    await submitRating(partner.partnerId, yesterday, partnerYesterdayCheckIn.id, rateComplete, rateEffort, rateComment || undefined)
    setRateComment('')
  }

  const myRatingsGiven = useMemo(() => {
    if (!user) return []
    return ratings.filter((r) => r.fromUserId === user.id).sort((a, b) => b.checkInDate.localeCompare(a.checkInDate))
  }, [user, ratings])

  if (!user) return null

  return (
    <div className="app-page">
      {needRate && partnerYesterdayCheckIn && (
        <div className="card" style={{ border: '2px solid var(--primary)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>待评分 · 伙伴昨日打卡</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            {yesterday}：体重 {partnerYesterdayCheckIn.weight ?? '-'} kg，
            运动 {partnerYesterdayCheckIn.sportType ?? '-'} {partnerYesterdayCheckIn.sportMinutes ?? 0} 分钟
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>完成度</span>
            <div className="star-rating" style={{ marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`star ${rateComplete >= s ? 'filled' : ''}`}
                  onClick={() => setRateComplete(s)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setRateComplete(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>努力度</span>
            <div className="star-rating" style={{ marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`star ${rateEffort >= s ? 'filled' : ''}`}
                  onClick={() => setRateEffort(s)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setRateEffort(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <textarea
            placeholder="写一句鼓励或建议（选填）"
            value={rateComment}
            onChange={(e) => setRateComment(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
            rows={2}
          />
          <button type="button" className="btn-primary" onClick={handleSubmitRating}>
            提交评分
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>系统通知</div>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无消息</p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {messages.slice(0, 20).map((m) => (
              <li
                key={m.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                  opacity: m.read ? 0.8 : 1,
                }}
                onClick={() => markMessageRead(m.id)}
              >
                <div style={{ fontWeight: 500 }}>{m.title}</div>
                {m.body && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.body}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.date.slice(0, 10)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>历史评分</div>
        {myRatingsGiven.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>暂无评分记录</p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {myRatingsGiven.map((r) => (
              <li key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.checkInDate}</span>
                  <span>完成度 {r.completeness}★ 努力度 {r.effort}★</span>
                </div>
                {r.comment && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{r.comment}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
