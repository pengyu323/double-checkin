-- 在 Supabase 控制台 -> SQL Editor 中执行此脚本（只执行一次）
-- 允许已登录用户为自己的「伙伴」插入一条消息，用于打卡后给对方发「评分提示」

drop policy if exists "messages_insert_for_partner" on public.messages;
create policy "messages_insert_for_partner" on public.messages
  for insert
  with check (
    user_id in (
      select partner_id from public.partner_bindings where user_id = auth.uid()
    )
  );
