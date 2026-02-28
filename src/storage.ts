import type { User, PartnerBinding, CheckIn, Rating, AppMessage } from './types'

const PREFIX = 'double_checkin_'

export const storage = {
  user: {
    get(): User | null {
      const raw = localStorage.getItem(PREFIX + 'user')
      return raw ? JSON.parse(raw) : null
    },
    set(u: User | null) {
      if (u) localStorage.setItem(PREFIX + 'user', JSON.stringify(u))
      else localStorage.removeItem(PREFIX + 'user')
    },
  },
  partner: {
    get(): PartnerBinding | null {
      const raw = localStorage.getItem(PREFIX + 'partner')
      return raw ? JSON.parse(raw) : null
    },
    set(p: PartnerBinding | null) {
      if (p) localStorage.setItem(PREFIX + 'partner', JSON.stringify(p))
      else localStorage.removeItem(PREFIX + 'partner')
    },
  },
  checkIns: {
    get(): CheckIn[] {
      const raw = localStorage.getItem(PREFIX + 'checkins')
      return raw ? JSON.parse(raw) : []
    },
    set(list: CheckIn[]) {
      localStorage.setItem(PREFIX + 'checkins', JSON.stringify(list))
    },
  },
  ratings: {
    get(): Rating[] {
      const raw = localStorage.getItem(PREFIX + 'ratings')
      return raw ? JSON.parse(raw) : []
    },
    set(list: Rating[]) {
      localStorage.setItem(PREFIX + 'ratings', JSON.stringify(list))
    },
  },
  messages: {
    get(): AppMessage[] {
      const raw = localStorage.getItem(PREFIX + 'messages')
      return raw ? JSON.parse(raw) : []
    },
    set(list: AppMessage[]) {
      localStorage.setItem(PREFIX + 'messages', JSON.stringify(list))
    },
  },
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr()
}

/** 当日 00:00 - 23:59 有效，23:59 之后不可补打 */
export function canCheckIn(dateStr: string): boolean {
  const today = todayStr()
  if (dateStr > today) return false
  if (dateStr < today) return false
  return true
}

/** 评分需在次日 24:00 前完成 */
export function canRate(checkInDate: string): boolean {
  const today = todayStr()
  const d = new Date(checkInDate)
  d.setDate(d.getDate() + 1)
  const deadline = d.toISOString().slice(0, 10)
  return today <= deadline
}

/** 是否已过评分截止日（次日末） */
export function isRatingExpired(checkInDate: string): boolean {
  const today = todayStr()
  const d = new Date(checkInDate)
  d.setDate(d.getDate() + 2)
  const deadline = d.toISOString().slice(0, 10)
  return today >= deadline
}
