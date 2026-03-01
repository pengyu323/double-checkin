-- 在 Supabase 控制台 -> SQL Editor 中执行此脚本（只执行一次）
-- 绑定伙伴时双向建立关系，并给被绑定方（邀请码拥有者）发一条「已与你建立伙伴关系」通知

create or replace function public.bind_partner_symmetric(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_id uuid := auth.uid();
  v_partner public.profiles%rowtype;
  v_my_nickname text;
begin
  if v_my_id is null then
    raise exception 'not_logged_in';
  end if;
  select * into v_partner from public.profiles where invite_code = upper(trim(p_invite_code)) limit 1;
  if v_partner.id is null then
    raise exception 'invite_code_invalid';
  end if;
  if v_partner.id = v_my_id then
    raise exception 'cannot_bind_self';
  end if;
  select nickname into v_my_nickname from public.profiles where id = v_my_id;
  insert into public.partner_bindings (user_id, partner_id) values (v_my_id, v_partner.id)
  on conflict (user_id) do update set partner_id = v_partner.id;
  insert into public.partner_bindings (user_id, partner_id) values (v_partner.id, v_my_id)
  on conflict (user_id) do update set partner_id = v_my_id;
  insert into public.messages (user_id, type, title, body)
  values (v_partner.id, 'bind', v_my_nickname || ' 已与你建立伙伴关系', '对方已通过你的邀请码与你建立伙伴关系，现在可以互看打卡并评分了。');
  return jsonb_build_object(
    'id', v_partner.id,
    'nickname', v_partner.nickname,
    'avatar_url', v_partner.avatar_url,
    'invite_code', v_partner.invite_code
  );
end;
$$;

grant execute on function public.bind_partner_symmetric(text) to authenticated;
grant execute on function public.bind_partner_symmetric(text) to anon;

-- 解除绑定时同步删除对方的绑定（双向解除）
create or replace function public.partner_bindings_delete_symmetric()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.partner_bindings
  where user_id = old.partner_id and partner_id = old.user_id;
  return old;
end;
$$;
drop trigger if exists partner_bindings_after_delete_symmetric on public.partner_bindings;
create trigger partner_bindings_after_delete_symmetric
  after delete on public.partner_bindings
  for each row execute function public.partner_bindings_delete_symmetric();
