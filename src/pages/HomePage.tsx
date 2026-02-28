import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayStr } from '../storage'
import type { SportType } from '../types'

const SPORT_OPTIONS: SportType[] = ['跑步', '游泳', '力量', '瑜伽', '骑行', '其他']

const defaultForm = {
  weight: '',
  bodyFat: '',
  sportType: '' as SportType | '',
  sportMinutes: '',
  breakfast: '',
  lunch: '',
  dinner: '',
  waterCups: '0',
  waterMl: '',
  sleepHours: '',
  mood: '',
}

export default function HomePage() {
  const { user, partner, getMyCheckInForDate, submitCheckIn } = useApp()
  const today = todayStr()
  const existing = getMyCheckInForDate(today)
  const [form, setForm] = useState(defaultForm)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (existing) {
      setForm({
        weight: existing.weight?.toString() ?? '',
        bodyFat: existing.bodyFat?.toString() ?? '',
        sportType: existing.sportType ?? '',
        sportMinutes: existing.sportMinutes?.toString() ?? '',
        breakfast: existing.breakfast ?? '',
        lunch: existing.lunch ?? '',
        dinner: existing.dinner ?? '',
        waterCups: existing.waterCups?.toString() ?? '0',
        waterMl: existing.waterMl?.toString() ?? '',
        sleepHours: existing.sleepHours?.toString() ?? '',
        mood: existing.mood ?? '',
      })
      setSubmitted(true)
    }
  }, [existing?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const checkIn = await submitCheckIn({
      weight: form.weight ? parseFloat(form.weight) : undefined,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      sportType: form.sportType || undefined,
      sportMinutes: form.sportMinutes ? parseInt(form.sportMinutes, 10) : undefined,
      breakfast: form.breakfast || undefined,
      lunch: form.lunch || undefined,
      dinner: form.dinner || undefined,
      waterCups: form.waterCups ? parseInt(form.waterCups, 10) : undefined,
      waterMl: form.waterMl ? parseInt(form.waterMl, 10) : undefined,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : undefined,
      mood: form.mood || undefined,
    })
    if (checkIn) setSubmitted(true)
  }

  const dateLabel = (() => {
    const d = new Date()
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`
  })()

  if (!user) return null

  return (
    <div className="app-page">
      {!partner && (
        <div className="card" style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid var(--primary)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>邀请伙伴一起打卡</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>绑定伙伴后可互评、对比，互相监督更易坚持。</div>
          <Link to="/bind" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>去绑定</Link>
        </div>
      )}
      <header className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>今日打卡</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{dateLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {user.nickname.slice(0, 1)}
          </div>
          <span style={{ fontWeight: 500 }}>{user.nickname}</span>
          {partner && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                {partner.partnerNickname.slice(0, 1)}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{partner.partnerNickname}</span>
            </>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <div className="input-row">
          <label>体重(kg)</label>
          <input
            type="number"
            step="0.1"
            placeholder="选填"
            value={form.weight}
            onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>体脂率(%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="选填"
            value={form.bodyFat}
            onChange={(e) => setForm((f) => ({ ...f, bodyFat: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>运动类型</label>
          <select
            value={form.sportType}
            onChange={(e) => setForm((f) => ({ ...f, sportType: e.target.value as SportType }))}
          >
            <option value="">选填</option>
            {SPORT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="input-row">
          <label>运动时长(分钟)</label>
          <input
            type="number"
            min="0"
            placeholder="选填"
            value={form.sportMinutes}
            onChange={(e) => setForm((f) => ({ ...f, sportMinutes: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>早餐</label>
          <input
            type="text"
            placeholder="简单描述或留空"
            value={form.breakfast}
            onChange={(e) => setForm((f) => ({ ...f, breakfast: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>午餐</label>
          <input
            type="text"
            placeholder="简单描述或留空"
            value={form.lunch}
            onChange={(e) => setForm((f) => ({ ...f, lunch: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>晚餐</label>
          <input
            type="text"
            placeholder="简单描述或留空"
            value={form.dinner}
            onChange={(e) => setForm((f) => ({ ...f, dinner: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>饮水量</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, waterCups: Math.max(0, parseInt(f.waterCups, 10) - 1).toString() }))}
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', fontWeight: 600 }}
            >
              −
            </button>
            <span style={{ minWidth: 40, textAlign: 'center' }}>{form.waterCups} 杯</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, waterCups: ((parseInt(f.waterCups, 10) || 0) + 1).toString() }))}
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}
            >
              +
            </button>
            <input
              type="number"
              min="0"
              placeholder="或填ml"
              value={form.waterMl}
              onChange={(e) => setForm((f) => ({ ...f, waterMl: e.target.value }))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ml</span>
          </div>
        </div>
        <div className="input-row">
          <label>睡眠(小时)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            placeholder="昨晚睡眠"
            value={form.sleepHours}
            onChange={(e) => setForm((f) => ({ ...f, sleepHours: e.target.value }))}
          />
        </div>
        <div className="input-row">
          <label>心情/备注</label>
          <textarea
            placeholder="今天的感觉..."
            value={form.mood}
            onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: 16 }}
        >
          {submitted ? '已打卡（可修改后再次提交）' : '提交打卡'}
        </button>
      </form>
    </div>
  )
}
