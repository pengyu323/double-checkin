import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'
import type { User, PartnerBinding, CheckIn, Rating, AppMessage } from '../types'
import { storage, genId, todayStr, canCheckIn } from '../storage'
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
  submitRating: (toUserId: string, checkInDate: string, checkInId: string, completeness: number, effort: number, comment?: string) => Promise<void>
  getRating: (checkInDate: string, toUserId: string) => Rating | undefined
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
      const result = await supabaseBindByInviteCode(state.user.id, code)
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
        const result = await supabaseUpsertCheckIn(user.id, date, data)
        if ('error' in result) return null
        setState((s) => {
          const rest = s.checkIns.filter((c) => !(c.userId === user.id && c.date === date))
          return { ...s, checkIns: [result.checkIn, ...rest] }
        })
        if (state.partner) {
          supabaseAddMessageForPartner(state.partner.partnerId, {
            type: 'partner_done',
            title: '伙伴已打卡',
            body: '明日可在「消息」页为 TA 的今日打卡评分',
            extra: { checkInDate: date },
          }).then(() => refresh())
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
      if (!fromId) return
      if (state.supabaseMode) {
        await supabaseUpsertRating(fromId, toUserId, checkInDate, checkInId, completeness, effort, comment)
        const ratings = await supabaseGetRatings()
        setState((s) => ({ ...s, ratings }))
        return
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
