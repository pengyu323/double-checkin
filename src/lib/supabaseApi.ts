import { supabase, isSupabaseEnabled } from './supabase'
import type { User, PartnerBinding, CheckIn, Rating, AppMessage } from '../types'
import type { SportType } from '../types'
import { generateInviteCode } from './inviteCode'

/** Supabase profiles 行 -> 前端 User */
function profileToUser(row: { id: string; nickname: string; avatar_url: string | null; invite_code: string }): User {
  return {
    id: row.id,
    nickname: row.nickname,
    avatar: row.avatar_url || '',
    inviteCode: row.invite_code,
  }
}

/** Supabase check_ins 行 -> 前端 CheckIn */
function rowToCheckIn(row: Record<string, unknown>): CheckIn {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    weight: row.weight != null ? Number(row.weight) : undefined,
    bodyFat: row.body_fat != null ? Number(row.body_fat) : undefined,
    sportType: row.sport_type as SportType | undefined,
    sportMinutes: row.sport_minutes != null ? Number(row.sport_minutes) : undefined,
    breakfast: row.breakfast as string | undefined,
    lunch: row.lunch as string | undefined,
    dinner: row.dinner as string | undefined,
    mealImages: row.meal_images as string[] | undefined,
    waterCups: row.water_cups != null ? Number(row.water_cups) : undefined,
    waterMl: row.water_ml != null ? Number(row.water_ml) : undefined,
    sleepHours: row.sleep_hours != null ? Number(row.sleep_hours) : undefined,
    mood: row.mood as string | undefined,
    createdAt: (row.created_at as string) || '',
  }
}

/** Supabase ratings 行 -> 前端 Rating */
function rowToRating(row: Record<string, unknown>): Rating {
  return {
    id: row.id as string,
    fromUserId: row.from_user_id as string,
    toUserId: row.to_user_id as string,
    checkInDate: row.check_in_date as string,
    checkInId: row.check_in_id as string,
    completeness: Number(row.completeness),
    effort: Number(row.effort),
    comment: row.comment as string | undefined,
    createdAt: (row.created_at as string) || '',
  }
}

/** Supabase messages 行 -> 前端 AppMessage */
function rowToMessage(row: Record<string, unknown>): AppMessage {
  return {
    id: row.id as string,
    type: row.type as AppMessage['type'],
    title: row.title as string,
    body: row.body as string | undefined,
    date: (row.created_at as string) || '',
    read: !!row.read,
    extra: row.extra as AppMessage['extra'],
  }
}

// --- 登录 / 资料 ---

export async function supabaseLogin(nickname: string): Promise<{ user: User } | { error: string }> {
  if (!supabase) return { error: 'Supabase 未配置' }
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  if (authError) return { error: authError.message }
  const uid = authData.user?.id
  if (!uid) return { error: '登录失败' }

  let code = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const { error: upsertErr } = await supabase.from('profiles').upsert(
      { id: uid, nickname, invite_code: code, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (!upsertErr) {
      const { data: profile } = await supabase.from('profiles').select('id,nickname,avatar_url,invite_code').eq('id', uid).single()
      if (profile) return { user: profileToUser(profile) }
    }
    if (upsertErr?.code === '23505') code = generateInviteCode()
    else if (upsertErr) return { error: upsertErr.message }
  }
  return { error: '邀请码冲突，请重试' }
}

export async function supabaseGetProfile(userId: string): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('id,nickname,avatar_url,invite_code').eq('id', userId).single()
  return data ? profileToUser(data) : null
}

export async function supabaseGetCurrentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return null
  return supabaseGetProfile(authUser.id)
}

export async function supabaseLogout(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}

// --- 伙伴绑定 ---

export async function supabaseGetPartnerBinding(myUserId: string): Promise<PartnerBinding | null> {
  if (!supabase) return null
  const { data: binding } = await supabase
    .from('partner_bindings')
    .select('partner_id')
    .eq('user_id', myUserId)
    .maybeSingle()
  if (!binding?.partner_id) return null
  const partner = await supabaseGetProfile(binding.partner_id)
  if (!partner) return null
  return {
    partnerId: partner.id,
    partnerNickname: partner.nickname,
    partnerAvatar: partner.avatar,
    partnerInviteCode: partner.inviteCode,
    boundAt: '',
  }
}

/** 通过邀请码绑定：写入双向关系，并给邀请码拥有者发「已与你建立伙伴关系」通知 */
export async function supabaseBindByInviteCode(myUserId: string, inviteCode: string): Promise<{ ok: true; partner: PartnerBinding } | { error: string }> {
  if (!supabase) return { error: 'Supabase 未配置' }
  const code = inviteCode.trim().toUpperCase()
  const { data, error } = await supabase.rpc('bind_partner_symmetric', { p_invite_code: code })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('invite_code_invalid')) return { error: '邀请码不存在或无效' }
    if (msg.includes('cannot_bind_self')) return { error: '不能绑定自己' }
    return { error: msg || '绑定失败' }
  }
  if (!data || typeof data !== 'object') return { error: '绑定失败' }
  const row = data as { id: string; nickname: string; avatar_url: string | null; invite_code: string }
  const partner: PartnerBinding = {
    partnerId: row.id,
    partnerNickname: row.nickname,
    partnerAvatar: row.avatar_url || '',
    partnerInviteCode: row.invite_code,
    boundAt: new Date().toISOString(),
  }
  return { ok: true, partner }
}

export async function supabaseUnbind(myUserId: string): Promise<{ error?: string }> {
  if (!supabase) return {}
  const { error } = await supabase.from('partner_bindings').delete().eq('user_id', myUserId)
  return error ? { error: error.message } : {}
}

// --- 打卡 ---

export async function supabaseGetCheckIns(userId: string): Promise<CheckIn[]> {
  if (!supabase) return []
  const { data } = await supabase.from('check_ins').select('*').eq('user_id', userId).order('date', { ascending: false })
  return (data || []).map(rowToCheckIn)
}

export async function supabaseGetCheckInsForPartner(myUserId: string): Promise<CheckIn[]> {
  if (!supabase) return []
  const { data: binding } = await supabase.from('partner_bindings').select('partner_id').eq('user_id', myUserId).maybeSingle()
  if (!binding?.partner_id) return []
  return supabaseGetCheckIns(binding.partner_id)
}

export async function supabaseUpsertCheckIn(
  userId: string,
  date: string,
  data: Omit<CheckIn, 'id' | 'userId' | 'date' | 'createdAt'>
): Promise<{ checkIn: CheckIn } | { error: string }> {
  if (!supabase) return { error: 'Supabase 未配置' }
  const row = {
    user_id: userId,
    date,
    weight: data.weight ?? null,
    body_fat: data.bodyFat ?? null,
    sport_type: data.sportType ?? null,
    sport_minutes: data.sportMinutes ?? null,
    breakfast: data.breakfast ?? null,
    lunch: data.lunch ?? null,
    dinner: data.dinner ?? null,
    water_cups: data.waterCups ?? null,
    water_ml: data.waterMl ?? null,
    sleep_hours: data.sleepHours ?? null,
    mood: data.mood ?? null,
    meal_images: data.mealImages ?? null,
    updated_at: new Date().toISOString(),
  }
  const { data: inserted, error } = await supabase.from('check_ins').upsert(row, { onConflict: 'user_id,date' }).select().single()
  if (error) return { error: error.message }
  return { checkIn: rowToCheckIn(inserted) }
}

// --- 评分 ---

export async function supabaseGetRatings(): Promise<Rating[]> {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []
  const { data } = await supabase
    .from('ratings')
    .select('*')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
  return (data || []).map(rowToRating)
}

export async function supabaseUpsertRating(
  fromUserId: string,
  toUserId: string,
  checkInDate: string,
  checkInId: string,
  completeness: number,
  effort: number,
  comment?: string
): Promise<{ error?: string }> {
  if (!supabase) return {}
  const { error } = await supabase.from('ratings').upsert(
    {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      check_in_date: checkInDate,
      check_in_id: checkInId,
      completeness,
      effort,
      comment: comment ?? null,
    },
    { onConflict: 'from_user_id,to_user_id,check_in_date' }
  )
  return error ? { error: error.message } : {}
}

// --- 消息 ---

export async function supabaseGetMessages(userId: string): Promise<AppMessage[]> {
  if (!supabase) return []
  const { data } = await supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200)
  return (data || []).map(rowToMessage)
}

export async function supabaseAddMessage(
  userId: string,
  msg: Omit<AppMessage, 'id' | 'read' | 'date'>
): Promise<{ error?: string }> {
  if (!supabase) return {}
  const { error } = await supabase.from('messages').insert({
    user_id: userId,
    type: msg.type,
    title: msg.title,
    body: msg.body ?? null,
    extra: msg.extra ?? null,
  })
  return error ? { error: error.message } : {}
}

/** 给伙伴发一条消息（用于打卡后通知对方去评分），仅当对方是自己的绑定伙伴时 RLS 允许 */
export async function supabaseAddMessageForPartner(
  partnerUserId: string,
  msg: Omit<AppMessage, 'id' | 'read' | 'date'>
): Promise<{ error?: string }> {
  return supabaseAddMessage(partnerUserId, msg)
}

export async function supabaseMarkMessageRead(messageId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('messages').update({ read: true }).eq('id', messageId)
}

/** 订阅「我的消息」表的新增，用于实时收到「伙伴已打卡」等提示 */
export function supabaseSubscribeMessages(userId: string, onMessagesChanged: () => void): () => void {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client
    .channel('messages-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${userId}`,
      },
      () => onMessagesChanged()
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}

export { isSupabaseEnabled }
