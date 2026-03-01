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
    if (res && 'ok' in res) setRemindTip('已提醒伙伴，TA 会在消息里收到')
    if (res && 'error' in res) setRemindTip(res.error)
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
            {(() => {
              const c = pendingCheckIn
              const filledBg = 'rgba(255, 193, 7, 0.25)'
              const emptyBg = 'rgba(244, 67, 54, 0.2)'
              const row = (label: string, value: string | number | undefined | null, suffix = '') => {
                const filled = value !== undefined && value !== null && value !== ''
                const text = filled ? `${value}${suffix}` : '对方没有填写'
                return (
                  <div key={label} style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ minWidth: 56 }}>{label}：</span>
                    <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: filled ? filledBg : emptyBg }}>{text}</span>
                  </div>
                )
              }
              return (
                <>
                  <div key="日期" style={{ marginBottom: 6 }}>日期：{pendingDate}</div>
                  {row('体重', c.weight != null ? c.weight : undefined, ' kg')}
                  {row('体脂', c.bodyFat != null ? c.bodyFat : undefined, '%')}
                  {row('运动', c.sportType || (c.sportMinutes != null) ? `${c.sportType ?? '-'} ${c.sportMinutes ?? 0} 分钟` : undefined)}
                  {row('早餐', c.breakfast || undefined)}
                  {row('午餐', c.lunch || undefined)}
                  {row('晚餐', c.dinner || undefined)}
                  {row('饮水', (c.waterCups != null) || (c.waterMl != null) ? `${c.waterCups ?? 0} 杯${c.waterMl ? ` ${c.waterMl} ml` : ''}` : undefined)}
                  {row('睡眠', c.sleepHours != null ? c.sleepHours : undefined, ' 小时')}
                  {row('心情', c.mood || undefined)}
                </>
              )
            })()}
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
