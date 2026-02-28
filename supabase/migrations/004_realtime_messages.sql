-- 在 Supabase 控制台 -> SQL Editor 中执行此脚本（只执行一次）
-- 让「消息」表支持 Realtime，这样对方打卡后你无需刷新即可收到「伙伴已打卡」提示

alter publication supabase_realtime add table public.messages;
