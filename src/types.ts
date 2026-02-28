/** 用户 */
export interface User {
  id: string
  nickname: string
  avatar: string
  phone?: string
  inviteCode: string
}

/** 伙伴绑定关系 */
export interface PartnerBinding {
  partnerId: string
  partnerNickname: string
  partnerAvatar: string
  partnerInviteCode: string
  boundAt: string
}

/** 运动类型 */
export type SportType = '跑步' | '游泳' | '力量' | '瑜伽' | '骑行' | '其他'

/** 单日打卡记录 */
export interface CheckIn {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  weight?: number
  bodyFat?: number
  sportType?: SportType
  sportMinutes?: number
  breakfast?: string
  lunch?: string
  dinner?: string
  mealImages?: string[] // base64 or url
  waterCups?: number
  waterMl?: number
  sleepHours?: number
  mood?: string
  createdAt: string
}

/** 对伙伴的评分 */
export interface Rating {
  id: string
  fromUserId: string
  toUserId: string
  checkInDate: string
  checkInId: string
  completeness: number // 1-5
  effort: number // 1-5
  comment?: string
  createdAt: string
}

/** 消息/通知 */
export interface AppMessage {
  id: string
  type: 'remind_checkin' | 'remind_rate' | 'partner_done' | 'bind' | 'unbind'
  title: string
  body?: string
  date: string
  read: boolean
  extra?: { checkInDate?: string; fromUserId?: string }
}

/** 成就 */
export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  unlockedAt?: string
}
