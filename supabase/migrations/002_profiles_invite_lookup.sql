-- 在 Supabase 控制台 -> SQL Editor 中执行此脚本（只执行一次）
-- 允许已登录用户通过邀请码查找对方资料，否则「加入伙伴」会一直提示「邀请码不存在或无效」

drop policy if exists "profiles_read_by_invite_lookup" on public.profiles;
create policy "profiles_read_by_invite_lookup" on public.profiles
  for select
  using (auth.role() = 'authenticated');
