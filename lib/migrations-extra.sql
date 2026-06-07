-- Run in Supabase SQL Editor

create table if not exists pin_reveal_codes (
  id serial primary key,
  child_id text not null,
  code text not null,
  used boolean default false,
  expires_at timestamptz default now() + interval '5 minutes',
  created_at timestamptz default now()
);

create table if not exists goals (
  id serial primary key,
  child_id text not null,
  parent_id text,
  emoji text not null default '🎯',
  name text not null,
  saved_pc int not null default 0,
  target_pc int not null,
  type text not null default 'personal' check (type in ('personal', 'parent_task')),
  reward_pc int default 0,
  reward_xp int default 0,
  description text,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz default now()
);

create table if not exists child_notifications (
  id serial primary key,
  child_id text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  type text not null default 'info',
  created_at timestamptz default now()
);
