-- ============================================================
--  AI Photo Story · Supabase 스키마
--  Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 "Run" 하세요.
--  (여러 번 실행해도 안전하도록 작성되어 있습니다.)
-- ============================================================

-- ────────────────────────────────
-- 1) 테이블
-- ────────────────────────────────

-- 프로필 (auth.users 와 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 스토리(앨범)
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  narrative text,
  layout text not null default 'classic',
  tone text not null default 'diary',
  is_public boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists stories_user_id_idx on public.stories(user_id);
create index if not exists stories_public_idx on public.stories(is_public, created_at desc);

-- 부적절 콘텐츠 플래그 (공개/갤러리에서 제외). 기존 테이블에도 안전하게 추가.
alter table public.stories add column if not exists is_flagged boolean not null default false;

-- 스토리에 속한 사진들
create table if not exists public.story_photos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  image_url text not null,
  caption text,
  order_index integer not null default 0
);
create index if not exists story_photos_story_id_idx on public.story_photos(story_id);

-- 생성 요청 로그 (rate limit 용)
create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists generation_events_user_time_idx
  on public.generation_events(user_id, created_at desc);

-- ────────────────────────────────
-- 2) RLS (Row Level Security)
-- ────────────────────────────────
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_photos enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- stories: 공개이거나 본인 것이면 읽기 / 쓰기·수정·삭제는 본인만
drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories
  for select using (is_public or auth.uid() = user_id);
drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = user_id);
drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own" on public.stories
  for update using (auth.uid() = user_id);
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories
  for delete using (auth.uid() = user_id);

-- story_photos: 상위 스토리의 접근 권한을 그대로 따름
drop policy if exists "story_photos_select" on public.story_photos;
create policy "story_photos_select" on public.story_photos
  for select using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and (s.is_public or s.user_id = auth.uid())
    )
  );
drop policy if exists "story_photos_insert_own" on public.story_photos;
create policy "story_photos_insert_own" on public.story_photos
  for insert with check (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    )
  );
drop policy if exists "story_photos_delete_own" on public.story_photos;
create policy "story_photos_delete_own" on public.story_photos
  for delete using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    )
  );

-- generation_events: 본인 것만 기록/조회 (rate limit)
alter table public.generation_events enable row level security;
drop policy if exists "gen_events_insert_own" on public.generation_events;
create policy "gen_events_insert_own" on public.generation_events
  for insert with check (auth.uid() = user_id);
drop policy if exists "gen_events_select_own" on public.generation_events;
create policy "gen_events_select_own" on public.generation_events
  for select using (auth.uid() = user_id);

-- ────────────────────────────────
-- 3) 신규 가입 시 프로필 자동 생성
-- ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────
-- 4) 조회수 증가 함수 (공개 스토리만)
-- ────────────────────────────────
create or replace function public.increment_story_view(sid uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.stories
  set view_count = view_count + 1
  where id = sid and is_public;
$$;

grant execute on function public.increment_story_view(uuid) to anon, authenticated;

-- ────────────────────────────────
-- 5) Storage: photos 버킷 (비공개 · 서명 URL 로만 접근)
-- ────────────────────────────────
-- 비공개(public=false) 버킷 + 파일당 10MB + 이미지 형식만 허용 (보안·비용)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 이 사진을 읽을 수 있는가? 본인 소유(폴더=uid) 또는 '공개+미플래그 스토리'에 속한 사진.
-- SECURITY DEFINER 로 내부 조회는 RLS 를 우회 → 스토리지 정책에서 안전하게 재사용.
create or replace function public.can_read_photo(object_name text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    split_part(object_name, '/', 1) = coalesce((select auth.uid())::text, '')
    or exists (
      select 1
      from public.story_photos sp
      join public.stories s on s.id = sp.story_id
      where sp.image_url = object_name
        and s.is_public
        and not s.is_flagged
    );
$$;
grant execute on function public.can_read_photo(text) to anon, authenticated;

-- 읽기: 위 함수 통과 시에만 (서명 URL 발급도 이 정책을 통과해야 함)
drop policy if exists "photos_public_read" on storage.objects;
drop policy if exists "photos_read" on storage.objects;
create policy "photos_read" on storage.objects
  for select using (bucket_id = 'photos' and public.can_read_photo(name));

drop policy if exists "photos_auth_insert" on storage.objects;
create policy "photos_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos_owner_delete" on storage.objects;
create policy "photos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 완료! 🎉
