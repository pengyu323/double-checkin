-- 在 Supabase 控制台 -> SQL Editor 中执行此脚本
-- 用于「双人减肥打卡」的建表与行级安全(RLS)

-- 1. 个人资料（id 与 auth.users 一致，使用匿名登录时由客户端创建）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '用户',
  avatar_url text,
  invite_code text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 伙伴绑定：每人最多一条，存「我 -> 对方」
create table if not exists public.partner_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  check (user_id != partner_id)
);

-- 3. 打卡记录
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  weight numeric(4,1),
  body_fat numeric(4,1),
  sport_type text,
  sport_minutes int,
  breakfast text,
  lunch text,
  dinner text,
  water_cups int,
  water_ml int,
  sleep_hours numeric(3,1),
  mood text,
  meal_images jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- 4. 互评
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  check_in_date date not null,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  completeness int not null check (completeness >= 1 and completeness <= 5),
  effort int not null check (effort >= 1 and effort <= 5),
  comment text,
  created_at timestamptz default now(),
  unique(from_user_id, to_user_id, check_in_date)
);

-- 5. 消息/通知
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  extra jsonb,
  created_at timestamptz default now()
);

-- 启用 RLS
alter table public.profiles enable row level security;
alter table public.partner_bindings enable row level security;
alter table public.check_ins enable row level security;
alter table public.ratings enable row level security;
alter table public.messages enable row level security;

-- profiles: 可读自己 + 伙伴；只能改自己；只能插入自己
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_read_partner" on public.profiles;
create policy "profiles_read_partner" on public.profiles for select using (
  id in (select partner_id from public.partner_bindings where user_id = auth.uid())
  or id in (select user_id from public.partner_bindings where partner_id = auth.uid())
);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- partner_bindings: 可读自己参与的；只能插入/删除自己的
drop policy if exists "bindings_read_own" on public.partner_bindings;
create policy "bindings_read_own" on public.partner_bindings for select using (user_id = auth.uid() or partner_id = auth.uid());
drop policy if exists "bindings_insert_own" on public.partner_bindings;
create policy "bindings_insert_own" on public.partner_bindings for insert with check (user_id = auth.uid());
drop policy if exists "bindings_delete_own" on public.partner_bindings;
create policy "bindings_delete_own" on public.partner_bindings for delete using (user_id = auth.uid());

-- check_ins: 可读自己 + 伙伴的；只能插/改自己的
drop policy if exists "check_ins_read" on public.check_ins;
create policy "check_ins_read" on public.check_ins for select using (
  user_id = auth.uid()
  or user_id in (select partner_id from public.partner_bindings where user_id = auth.uid())
  or user_id in (select user_id from public.partner_bindings where partner_id = auth.uid())
);
drop policy if exists "check_ins_insert" on public.check_ins;
create policy "check_ins_insert" on public.check_ins for insert with check (user_id = auth.uid());
drop policy if exists "check_ins_update" on public.check_ins;
create policy "check_ins_update" on public.check_ins for update using (user_id = auth.uid());

-- ratings: 可读自己发出/收到的；只能插入自己发出的
drop policy if exists "ratings_read" on public.ratings;
create policy "ratings_read" on public.ratings for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings for insert with check (from_user_id = auth.uid());

-- messages: 仅自己
drop policy if exists "messages_read" on public.messages;
create policy "messages_read" on public.messages for select using (user_id = auth.uid());
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert with check (user_id = auth.uid());
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update using (user_id = auth.uid());
