import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { canRate, isRatingExpired, todayStr } from '../storage'

export default function MessagePage() {
  const { user, partner, ratings, messages, getRating, getPartnerCheckInForDate, getMyCheckInForDate, getRatingFromPartner, submitRating, remindPartnerToRate, markMessageRead } = useApp()

  const today = todayStr()
  const yesterday = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const partnerTodayCheckIn = partner ? getPartnerCheckInForDate(today) : null
  const partnerYesterdayCheckIn = partner ? getPartnerCheckInForDate(yesterday) : null
  const hasRatedToday = partner && partnerTodayCheckIn ? getRating(today, partner.partnerId) : null
  const hasRatedYesterday = partner && partnerYesterdayCheckIn ? getRating(yesterday, partner.partnerId) : null
  const needRateToday = partner && partnerTodayCheckIn && !hasRatedToday
  const needRateYesterday = partner && partnerYesterdayCheckIn && !hasRatedYesterday && canRate(yesterday) && !isRatingExpired(yesterday)
  const needRate = needRateToday || needRateYesterday
  const pendingCheckIn = needRateToday ? partnerTodayCheckIn : partnerYesterdayCheckIn
  const pendingDate = needRateToday ? today : yesterday
  const pendingLabel = needRateToday ? '伙伴今日打卡' : '伙伴昨日打卡'

  const myTodayCheckIn = user ? getMyCheckInForDate(today) : null
  const myYesterdayCheckIn = user ? getMyCheckInForDate(yesterday) : null
  const partnerRatedMyToday = partner && user ? getRatingFromPartner(today) : null
  const partnerRatedMyYesterday = partner && user ? getRatingFromPartner(yesterday) : null
  const canRemindPartner =
    (partner && myTodayCheckIn && !partnerRatedMyToday) ||
    (partner && myYesterdayCheckIn && !partnerRatedMyYesterday && canRate(yesterday) && !isRatingExpired(yesterday))

  const [rateComplete, setRateComplete] = useState(3)
  const [rateEffort, setRateEffort] = useState(3)
  const [rateComment, setRateComment] = useState('')
  const [remindLoading, setRemindLoading] = useState(false)
  const [remindTip, setRemindTip] = useState('')

  const handleRemindPartner = async () => {
    if (!canRemindPartner || remindLoading) return
    setRemindLoading(true)
    setRemindTip('')
    const res = await remindPartnerToRate()
    setRemindLoading(false)
    if (res?.ok) setRemindTip('已提醒伙伴，TA 会在消息里收到')
    if (res?.error) setRemindTip(res.error)
  }

  const handleSubmitRating = async () => {
    if (!partner || !pendingCheckIn) return
    await submitRating(partner.partnerId, pendingDate, pendingCheckIn.id, rateComplete, rateEffort, rateComment || undefined)
    setRateComment('')
  }

  const myRatingsGiven = useMemo(() => {
    if (!user) return []
    return ratings.filter((r) => r.fromUserId === user.id).sort((a, b) => b.checkInDate.localeCompare(a.checkInDate))
  }, [user, ratings])

  if (!user) return null

  return (
    <div className="app-page">
      {canRemindPartner && (
        <div className="card" style={{ border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>提醒伙伴评分</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 10 }}>
            {myTodayCheckIn && !partnerRatedMyToday && myYesterdayCheckIn && !partnerRatedMyYesterday && canRate(yesterday) && !isRatingExpired(yesterday)
              ? `伙伴还未为你的今日（${today}）或昨日（${yesterday}）打卡评分，点击下方按钮提醒 TA。`
              : myTodayCheckIn && !partnerRatedMyToday
                ? `伙伴还未为你的今日（${today}）打卡评分，点击下方按钮提醒 TA。`
                : `伙伴还未为你的昨日（${yesterday}）打卡评分，点击下方按钮提醒 TA。`}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleRemindPartner}
            disabled={remindLoading}
          >
            {remindLoading ? '发送中…' : '提醒 TA 评分'}
          </button>
          {remindTip && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{remindTip}</div>}
        </div>
      )}

      {needRate && pendingCheckIn && (
        <div className="card" style={{ border: '2px solid var(--primary)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>待评分 · {pendingLabel}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}>{pendingDate}</div>
            <div>体重 {pendingCheckIn.weight ?? '-'} kg，体脂 {pendingCheckIn.bodyFat ?? '-'}%</div>
            <div>运动 {pendingCheckIn.sportType ?? '-'} {pendingCheckIn.sportMinutes ?? 0} 分钟</div>
            <div>早/午/晚 {pendingCheckIn.breakfast || '-'} / {pendingCheckIn.lunch || '-'} / {pendingCheckIn.dinner || '-'}</div>
            <div>饮水 {pendingCheckIn.waterCups ?? '-'} 杯{pendingCheckIn.waterMl ? ` ${pendingCheckIn.waterMl} ml` : ''}，睡眠 {pendingCheckIn.sleepHours ?? '-'} 小时</div>
            <div>心情 {pendingCheckIn.mood || '-'}</div>
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
                {m.body && <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{m.body}</div>}
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
