-- Paste this into Supabase SQL Editor and run once.

create table if not exists parents (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists children (
  id text primary key default gen_random_uuid()::text,
  parent_id text not null references parents(id) on delete cascade,
  name text not null,
  surname text not null default '',
  password_hash text,
  login_code text,
  login_otp_slot bigint,
  login_code_expires_at timestamptz,
  otp_consumed_slot bigint,
  age int not null,
  avatar_emoji text not null default '🐣',
  card_last_four text not null default '0000',
  card_number text,
  card_holder_name text,
  card_cvv text,
  card_expiry text,
  color text not null default 'from-pink-400 to-purple-500',
  quiz_reward_pc int not null default 10,
  created_at timestamptz default now()
);

create table if not exists savings_goals (
  id text primary key default gen_random_uuid()::text,
  child_id text not null references children(id) on delete cascade,
  emoji text not null default '🎯',
  name text not null,
  target_pc int not null,
  saved_pc int not null default 0,
  created_at timestamptz default now()
);

-- Migration (existing projects): run in Supabase SQL Editor
-- alter table children
--   add column if not exists card_number      text,
--   add column if not exists card_holder_name text,
--   add column if not exists card_cvv         text,
--   add column if not exists card_expiry      text,
--   add column if not exists surname          text not null default '',
--   add column if not exists password_hash    text,
--   add column if not exists login_code            text,
--   add column if not exists login_otp_slot        bigint,
--   add column if not exists login_code_expires_at timestamptz,
--   add column if not exists otp_consumed_slot     bigint,
--   add column if not exists quiz_reward_pc        int not null default 10;
-- update children set login_code = lpad(floor(random() * 1000000)::text, 6, '0') where login_code is null;

create table if not exists sessions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  user_type text not null check (user_type in ('parent', 'child')),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz default now()
);

create table if not exists notifications (
  id serial primary key,
  parent_id text not null references parents(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  type text not null default 'info',
  created_at timestamptz default now()
);

create table if not exists child_notifications (
  id serial primary key,
  child_id text not null references children(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  type text not null default 'info',
  created_at timestamptz default now()
);

-- Spending limits (per child)
-- create table if not exists spending_rules (
--   child_id text not null references children(id) on delete cascade,
--   parent_id text not null references parents(id) on delete cascade,
--   daily_limit_pc int not null default 50,
--   allowed_categories text[] not null default '{food,transport}',
--   limits_config jsonb,
--   primary key (child_id)
-- );

-- alter table spending_rules add column if not exists limits_config jsonb;

-- Investment locking (child wallet)
-- alter table wallets add column if not exists card_frozen boolean not null default false;
-- alter table children add column if not exists card_frozen boolean not null default false;

-- alter table wallets add column if not exists locked_investment_pc int not null default 0;
-- alter table wallets add column if not exists parent_investment_pool_pc int not null default 0;

-- Market companies (run once if Learn tab shows no companies)
-- insert into companies (id, name, starting_price, current_price, icon) values
--   ('pizza-planet', 'Pizza Planet', 25, 25, '🍕'),
--   ('gamezone', 'GameZone Studios', 42, 42, '🎮'),
--   ('toy-kingdom', 'Toy Kingdom', 18, 18, '🧸'),
--   ('pet-paradise', 'Pet Paradise', 31, 31, '🐕')
-- on conflict (id) do nothing;

-- Lesson quiz progress (per child)
-- create table if not exists lesson_progress (
--   child_id text not null references children(id) on delete cascade,
--   lesson_id text not null,
--   quiz_passed boolean not null default false,
--   stars int not null default 0,
--   completed_at timestamptz,
--   primary key (child_id, lesson_id)
-- );

-- Dividend payments log
-- create table if not exists dividends_paid (
--   id serial primary key,
--   parent_id text not null references parents(id) on delete cascade,
--   child_id text not null references children(id) on delete cascade,
--   amount_pc int not null,
--   reason text,
--   created_at timestamptz default now()
-- );
