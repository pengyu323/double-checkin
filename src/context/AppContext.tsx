import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'
import type { User, PartnerBinding, CheckIn, Rating, AppMessage } from '../types'
import { storage, genId, todayStr, canCheckIn, canRate, isRatingExpired } from '../storage'
import {
  isSupabaseEnabled,
  supabaseGetCurrentUser,
  supabaseGetPartnerBinding,
  supabaseGetCheckIns,
  supabaseGetCheckInsForPartner,
  supabaseGetRatings,
  supabaseGetMessages,
  supabaseLogin,
  supabaseLogout,
  supabaseBindByInviteCode,
  supabaseUnbind,
  supabaseUpsertCheckIn,
  supabaseUpsertRating,
  supabaseAddMessage,
  supabaseAddMessageForPartner,
  supabaseMarkMessageRead,
  supabaseSubscribeMessages,
} from '../lib/supabaseApi'

type AppState = {
  user: User | null
  partner: PartnerBinding | null
  checkIns: CheckIn[]
  ratings: Rating[]
  messages: AppMessage[]
  loading: boolean
  supabaseMode: boolean
}

type AppActions = {
  login: (nickname: string, avatar?: string) => Promise<User | { error: string }>
  logout: () => Promise<void>
  bindPartner: (p: PartnerBinding) => void
  bindByInviteCode: (code: string) => Promise<{ ok: true } | { error: string }>
  unbindPartner: () => Promise<void>
  submitCheckIn: (data: Omit<CheckIn, 'id' | 'userId' | 'date' | 'createdAt'>) => Promise<CheckIn | null>
  getCheckIn: (date: string, userId?: string) => CheckIn | undefined
  submitRating: (toUserId: string, checkInDate: string, checkInId: string, completeness: number, effort: number, comment?: string) => Promise<{ ok: true } | { error: string }>
  getRating: (checkInDate: string, toUserId: string) => Rating | undefined
  getRatingFromPartner: (checkInDate: string) => Rating | undefined
  remindPartnerToRate: () => Promise<{ ok: true } | { error: string }>
  sendEncourageToPartner: (text: string) => Promise<{ ok: true } | { error: string }>
  addMessage: (msg: Omit<AppMessage, 'id' | 'read' | 'date'>) => void
  markMessageRead: (id: string) => void
  getMyCheckInForDate: (date: string) => CheckIn | undefined
  getPartnerCheckInForDate: (date: string) => CheckIn | undefined
  refresh: () => Promise<void>
}

const AppContext = createContext<AppState & AppActions | null>(null)

function loadStateLocal(): AppState {
  return {
    user: storage.user.get(),
    partner: storage.partner.get(),
    checkIns: storage.checkIns.get(),
    ratings: storage.ratings.get(),
    messages: storage.messages.get(),
    loading: false,
    supabaseMode: false,
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() =>
    isSupabaseEnabled()
      ? { ...loadStateLocal(), user: null, partner: null, checkIns: [], ratings: [], messages: [], loading: true, supabaseMode: true }
      : { ...loadStateLocal(), supabaseMode: false }
  )

  const refresh = useCallback(async () => {
    if (!state.supabaseMode || !state.user) return
    const [myCheckIns, partnerCheckIns, ratings, messages] = await Promise.all([
      supabaseGetCheckIns(state.user.id),
      supabaseGetCheckInsForPartner(state.user.id),
      supabaseGetRatings(),
      supabaseGetMessages(state.user.id),
    ])
    setState((s) => ({
      ...s,
      checkIns: [...myCheckIns, ...partnerCheckIns],
      ratings,
      messages,
    }))
  }, [state.supabaseMode, state.user?.id])

  useEffect(() => {
    if (!state.supabaseMode) {
      setState((s) => ({ ...s, ...loadStateLocal() }))
      return
    }
    let cancelled = false
    ;(async () => {
      const user = await supabaseGetCurrentUser()
      if (cancelled) return
      if (!user) {
        setState((s) => ({ ...s, user: null, partner: null, checkIns: [], ratings: [], messages: [], loading: false }))
        return
      }
      const [partner, myCheckIns, partnerCheckIns, ratings, messages] = await Promise.all([
        supabaseGetPartnerBinding(user.id),
        supabaseGetCheckIns(user.id),
        supabaseGetCheckInsForPartner(user.id),
        supabaseGetRatings(),
        supabaseGetMessages(user.id),
      ])
      if (cancelled) return
      setState((s) => ({
        ...s,
        user,
        partner,
        checkIns: [...myCheckIns, ...partnerCheckIns],
        ratings,
        messages,
        loading: false,
      }))
    })()
    return () => { cancelled = true }
  }, [state.supabaseMode])

  // 消息实时更新：订阅 messages 表 INSERT，有新消息时重新拉取
  useEffect(() => {
    if (!state.supabaseMode || !state.user?.id) return
    const userId = state.user.id
    const unsubscribe = supabaseSubscribeMessages(userId, () => {
      supabaseGetMessages(userId).then((messages) => {
        setState((s) => ({ ...s, messages }))
      })
    })
    return unsubscribe
  }, [state.supabaseMode, state.user?.id])

  const login = useCallback(
    async (nickname: string): Promise<User | { error: string }> => {
      if (state.supabaseMode) {
        const result = await supabaseLogin(nickname)
        if ('error' in result) return result
        const [partner, myCheckIns, partnerCheckIns, ratings, messages] = await Promise.all([
          supabaseGetPartnerBinding(result.user.id),
          supabaseGetCheckIns(result.user.id),
          supabaseGetCheckInsForPartner(result.user.id),
          supabaseGetRatings(),
          supabaseGetMessages(result.user.id),
        ])
        setState((s) => ({
          ...s,
          user: result.user,
          partner,
          checkIns: [...myCheckIns, ...partnerCheckIns],
          ratings,
          messages,
        }))
        return result.user
      }
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const user: User = { id: genId(), nickname, avatar: '', inviteCode: code }
      storage.user.set(user)
      setState((s) => ({ ...s, user }))
      return user
    },
    [state.supabaseMode]
  )

  const logout = useCallback(async () => {
    if (state.supabaseMode) await supabaseLogout()
    else storage.user.set(null); storage.partner.set(null)
    setState((s) => ({ ...s, user: null, partner: null, checkIns: [], ratings: [], messages: [] }))
  }, [state.supabaseMode])

  const bindPartner = useCallback((p: PartnerBinding) => {
    if (state.supabaseMode) return
    storage.partner.set(p)
    setState((s) => ({ ...s, partner: p }))
  }, [state.supabaseMode])

  const bindByInviteCode = useCallback(
    async (code: string): Promise<{ ok: true } | { error: string }> => {
      if (!state.supabaseMode || !state.user) return { error: '当前为本地模式或未登录' }
      const result = await supabaseBindByInviteCode(code)
      if ('error' in result) return result
      setState((s) => ({ ...s, partner: result.partner }))
      return { ok: true }
    },
    [state.supabaseMode, state.user?.id]
  )

  const unbindPartner = useCallback(async () => {
    if (state.supabaseMode && state.user) await supabaseUnbind(state.user.id)
    else storage.partner.set(null)
    setState((s) => ({ ...s, partner: null }))
  }, [state.supabaseMode, state.user?.id])

  const submitCheckIn = useCallback(
    async (data: Omit<CheckIn, 'id' | 'userId' | 'date' | 'createdAt'>): Promise<CheckIn | null> => {
      const user = state.supabaseMode ? state.user : storage.user.get()
      if (!user) return null
      const date = todayStr()
      if (!canCheckIn(date)) return null
      if (state.supabaseMode) {
        const existingToday = state.checkIns.find((c) => c.userId === user.id && c.date === date)
        const hadCheckInToday = !!existingToday
        const result = await supabaseUpsertCheckIn(user.id, date, data)
        if ('error' in result) return null
        setState((s) => {
          const rest = s.checkIns.filter((c) => !(c.userId === user.id && c.date === date))
          return { ...s, checkIns: [result.checkIn, ...rest] }
        })
        const buildSummary = (c: CheckIn) =>
          [
            `体重 ${c.weight ?? '-'} kg`,
            `运动 ${c.sportType ?? '-'} ${c.sportMinutes ?? 0} 分钟`,
            `早/午/晚 ${c.breakfast || '-'} / ${c.lunch || '-'} / ${c.dinner || '-'}`,
            `饮水 ${c.waterCups ?? '-'} 杯${c.waterMl ? ` ${c.waterMl} ml` : ''}`,
            `睡眠 ${c.sleepHours ?? '-'} 小时`,
            `心情 ${c.mood || '-'}`,
          ].join('；')
        const contentChanged =
          existingToday &&
          (existingToday.weight !== data.weight ||
            existingToday.bodyFat !== data.bodyFat ||
            (existingToday.sportType ?? '') !== (data.sportType ?? '') ||
            (existingToday.sportMinutes ?? 0) !== (data.sportMinutes ?? 0) ||
            (existingToday.breakfast ?? '') !== (data.breakfast ?? '') ||
            (existingToday.lunch ?? '') !== (data.lunch ?? '') ||
            (existingToday.dinner ?? '') !== (data.dinner ?? '') ||
            (existingToday.waterCups ?? 0) !== (data.waterCups ?? 0) ||
            (existingToday.waterMl ?? 0) !== (data.waterMl ?? 0) ||
            (existingToday.sleepHours ?? 0) !== (data.sleepHours ?? 0) ||
            (existingToday.mood ?? '') !== (data.mood ?? ''))
        if (state.partner) {
          if (!hadCheckInToday) {
            supabaseAddMessageForPartner(state.partner.partnerId, {
              type: 'partner_done',
              title: '伙伴已打卡',
              body: `可立即在「消息」页为 TA 的今日打卡评分。\nTA 今日：${buildSummary(result.checkIn)}`,
              extra: { checkInDate: date },
            }).then((res) => {
              if (res?.error) console.error('[评分提示] 给伙伴发消息失败:', res.error)
            }).catch((e) => console.error('[评分提示] 给伙伴发消息异常:', e))
          } else if (contentChanged) {
            supabaseAddMessageForPartner(state.partner.partnerId, {
              type: 'partner_done',
              title: '伙伴已更新今日打卡',
              body: `TA 更新了今日打卡内容，可到「消息」页查看并评分。\nTA 今日：${buildSummary(result.checkIn)}`,
              extra: { checkInDate: date },
            }).then((res) => {
              if (res?.error) console.error('[评分提示] 给伙伴发消息失败:', res.error)
            }).catch((e) => console.error('[评分提示] 给伙伴发消息异常:', e))
          }
        }
        return result.checkIn
      }
      const existing = state.checkIns.find((c) => c.userId === user.id && c.date === date)
      const checkIn: CheckIn = {
        ...data,
        id: existing?.id ?? genId(),
        userId: user.id,
        date,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      const list = state.checkIns.filter((c) => !(c.userId === user.id && c.date === date))
      list.push(checkIn)
      setState((s) => ({ ...s, checkIns: list }))
      storage.checkIns.set(list)
      return checkIn
    },
    [state.supabaseMode, state.user, state.checkIns]
  )

  const getCheckIn = useCallback(
    (date: string, userId?: string) => {
      const uid = userId ?? state.user?.id ?? storage.user.get()?.id
      if (!uid) return undefined
      return state.checkIns.find((c) => c.userId === uid && c.date === date)
    },
    [state.checkIns, state.user?.id]
  )

  const getMyCheckInForDate = useCallback(
    (date: string) => {
      const uid = state.user?.id ?? storage.user.get()?.id
      if (!uid) return undefined
      return state.checkIns.find((c) => c.userId === uid && c.date === date)
    },
    [state.checkIns, state.user?.id]
  )

  const getPartnerCheckInForDate = useCallback(
    (date: string) => {
      const pid = state.partner?.partnerId ?? storage.partner.get()?.partnerId
      if (!pid) return undefined
      return state.checkIns.find((c) => c.userId === pid && c.date === date)
    },
    [state.checkIns, state.partner?.partnerId]
  )

  const submitRating = useCallback(
    async (
      toUserId: string,
      checkInDate: string,
      checkInId: string,
      completeness: number,
      effort: number,
      comment?: string
    ) => {
      const fromId = state.user?.id ?? storage.user.get()?.id
      if (!fromId) return { error: '请先登录' }
      if (state.supabaseMode) {
        const err = await supabaseUpsertRating(fromId, toUserId, checkInDate, checkInId, completeness, effort, comment)
        if (err?.error) return { error: err.error }
        const ratings = await supabaseGetRatings()
        setState((s) => ({ ...s, ratings }))
        const partner = state.partner ?? storage.partner.get()
        if (partner && partner.partnerId === toUserId) {
          const body = `你的 ${checkInDate} 打卡收到了 ${completeness}★ 完成度、${effort}★ 努力度${comment ? `，评语：「${comment}」` : ''}`
          await supabaseAddMessageForPartner(toUserId, {
            type: 'partner_rated',
            title: 'TA 刚刚给你的打卡点了赞',
            body,
            extra: { checkInDate },
          })
        }
        return { ok: true } as const
      }
      const existing = state.ratings.find((r) => r.fromUserId === fromId && r.toUserId === toUserId && r.checkInDate === checkInDate)
      const rating: Rating = {
        id: existing?.id ?? genId(),
        fromUserId: fromId,
        toUserId,
        checkInDate,
        checkInId,
        completeness,
        effort,
        comment,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      const list = state.ratings.filter(
        (r) => !(r.fromUserId === fromId && r.toUserId === toUserId && r.checkInDate === checkInDate)
      )
      list.push(rating)
      setState((s) => ({ ...s, ratings: list }))
      storage.ratings.set(list)
      return { ok: true } as const
    },
    [state.supabaseMode, state.user?.id, state.ratings]
  )

  const getRating = useCallback(
    (checkInDate: string, toUserId: string) => {
      const fromId = state.user?.id ?? storage.user.get()?.id
      if (!fromId) return undefined
      return state.ratings.find(
        (r) => r.fromUserId === fromId && r.toUserId === toUserId && r.checkInDate === checkInDate
      )
    },
    [state.ratings, state.user?.id]
  )

  /** 伙伴是否已对我在某日的打卡评过分 */
  const getRatingFromPartner = useCallback(
    (checkInDate: string) => {
      const myId = state.user?.id ?? storage.user.get()?.id
      const partnerId = state.partner?.partnerId ?? storage.partner.get()?.partnerId
      if (!myId || !partnerId) return undefined
      return state.ratings.find(
        (r) => r.fromUserId === partnerId && r.toUserId === myId && r.checkInDate === checkInDate
      )
    },
    [state.ratings, state.user?.id, state.partner?.partnerId]
  )

  /** 手动提醒伙伴为我的今日或昨日打卡评分（今日优先；若今日未评则次日仍可提醒昨日） */
  const remindPartnerToRate = useCallback(async (): Promise<{ ok: true } | { error: string }> => {
    if (!state.supabaseMode || !state.user || !state.partner) return { error: '未绑定伙伴或非联网模式' }
    const today = todayStr()
    const yesterday = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().slice(0, 10)
    })()
    const myToday = state.checkIns.find((c) => c.userId === state.user!.id && c.date === today)
    const myYesterday = state.checkIns.find((c) => c.userId === state.user!.id && c.date === yesterday)
    const partnerRatedToday = state.ratings.some(
      (r) => r.fromUserId === state.partner!.partnerId && r.toUserId === state.user!.id && r.checkInDate === today
    )
    const partnerRatedYesterday = state.ratings.some(
      (r) => r.fromUserId === state.partner!.partnerId && r.toUserId === state.user!.id && r.checkInDate === yesterday
    )
    if (myToday && !partnerRatedToday) {
      const res = await supabaseAddMessageForPartner(state.partner.partnerId, {
        type: 'remind_rate',
        title: 'TA 提醒你评分',
        body: `可立即在「消息」页为 TA 的今日（${today}）打卡评分哦`,
        extra: { checkInDate: today },
      })
      if (res?.error) return { error: res.error }
      return { ok: true }
    }
    if (myYesterday && !partnerRatedYesterday && canRate(yesterday) && !isRatingExpired(yesterday)) {
      const res = await supabaseAddMessageForPartner(state.partner.partnerId, {
        type: 'remind_rate',
        title: 'TA 提醒你评分',
        body: `记得在「消息」页为 TA 的昨日（${yesterday}）打卡评分哦`,
        extra: { checkInDate: yesterday },
      })
      if (res?.error) return { error: res.error }
      return { ok: true }
    }
    if (myToday && partnerRatedToday) return { error: '伙伴已为你的今日打卡评过分了' }
    if (myYesterday && partnerRatedYesterday) return { error: '伙伴已为你的昨日打卡评过分了' }
    if (myYesterday && (!canRate(yesterday) || isRatingExpired(yesterday))) return { error: '已过评分期限' }
    return { error: '暂无待评分的打卡' }
  }, [state.supabaseMode, state.user, state.partner, state.checkIns, state.ratings])

  const sendEncourageToPartner = useCallback(async (text: string): Promise<{ ok: true } | { error: string }> => {
    if (!state.supabaseMode || !state.partner) return { error: '未绑定伙伴或非联网模式' }
    const res = await supabaseAddMessageForPartner(state.partner.partnerId, {
      type: 'encourage',
      title: 'TA 夸了你',
      body: text,
    })
    if (res?.error) return { error: res.error }
    return { ok: true }
  }, [state.supabaseMode, state.partner])

  const addMessage = useCallback(
    (msg: Omit<AppMessage, 'id' | 'read' | 'date'>) => {
      if (state.supabaseMode && state.user) {
        supabaseAddMessage(state.user.id, msg).then(() => refresh())
        return
      }
      const full: AppMessage = {
        ...msg,
        id: genId(),
        date: new Date().toISOString(),
        read: false,
      }
      setState((s) => {
        const list = [full, ...s.messages].slice(0, 200)
        storage.messages.set(list)
        return { ...s, messages: list }
      })
    },
    [state.supabaseMode, state.user?.id, refresh]
  )

  const markMessageRead = useCallback((id: string) => {
    if (state.supabaseMode) {
      supabaseMarkMessageRead(id)
      setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) }))
      return
    }
    setState((s) => {
      const list = s.messages.map((m) => (m.id === id ? { ...m, read: true } : m))
      storage.messages.set(list)
      return { ...s, messages: list }
    })
  }, [state.supabaseMode])

  const value = useMemo<AppState & AppActions>(
    () => ({
      ...state,
      login,
      logout,
      bindPartner,
      bindByInviteCode,
      unbindPartner,
      submitCheckIn,
      getCheckIn,
      submitRating,
      getRating,
      getRatingFromPartner,
      remindPartnerToRate,
      sendEncourageToPartner,
      addMessage,
      markMessageRead,
      getMyCheckInForDate,
      getPartnerCheckInForDate,
      refresh,
    }),
    [
      state,
      login,
      logout,
      bindPartner,
      bindByInviteCode,
      unbindPartner,
      submitCheckIn,
      getCheckIn,
      submitRating,
      getRating,
      getRatingFromPartner,
      remindPartnerToRate,
      sendEncourageToPartner,
      addMessage,
      markMessageRead,
      getMyCheckInForDate,
      getPartnerCheckInForDate,
      refresh,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
