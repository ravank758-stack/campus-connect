create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  avatar_url text,
  college text not null default '',
  department text not null default '',
  year int not null default 1,
  bio text not null default '',
  availability text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles admin delete" on public.profiles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('teach','learn')),
  level text not null default 'Beginner',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.skills to authenticated;
grant all on public.skills to service_role;
alter table public.skills enable row level security;
create policy "skills read" on public.skills for select to authenticated using (true);
create policy "skills own write" on public.skills for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  message text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.match_requests to authenticated;
grant all on public.match_requests to service_role;
alter table public.match_requests enable row level security;
create policy "req read" on public.match_requests for select to authenticated using (auth.uid() in (sender_id, receiver_id) or public.has_role(auth.uid(),'admin'));
create policy "req insert" on public.match_requests for insert to authenticated with check (sender_id = auth.uid() and receiver_id <> auth.uid());
create policy "req update" on public.match_requests for update to authenticated using (receiver_id = auth.uid());
create policy "req delete" on public.match_requests for delete to authenticated using (sender_id = auth.uid());

create or replace function public.is_match_member(_req uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.match_requests where id=_req and status='accepted' and auth.uid() in (sender_id, receiver_id)) $$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "msg read" on public.messages for select to authenticated using (public.is_match_member(request_id));
create policy "msg insert" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_match_member(request_id));

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  organizer_id uuid not null,
  partner_id uuid not null,
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  location text not null default 'Online',
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;
create policy "sess read" on public.sessions for select to authenticated using (auth.uid() in (organizer_id, partner_id) or public.has_role(auth.uid(),'admin'));
create policy "sess insert" on public.sessions for insert to authenticated with check (organizer_id = auth.uid() and public.is_match_member(request_id));
create policy "sess update" on public.sessions for update to authenticated using (auth.uid() in (organizer_id, partner_id));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "rev read" on public.reviews for select to authenticated using (true);
create policy "rev insert" on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid() and reviewee_id <> auth.uid() and exists (
    select 1 from public.match_requests m where m.status='accepted' and
    ((m.sender_id=auth.uid() and m.receiver_id=reviewee_id) or (m.receiver_id=auth.uid() and m.sender_id=reviewee_id))));
create policy "rev delete" on public.reviews for delete to authenticated using (reviewer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  link text not null default '/dashboard',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif upd" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notif del" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- new user -> profile, first user admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if (select count(*) from public.user_roles where role='admin') = 0 then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- notifications triggers
create or replace function public.notify_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare nm text; other uuid;
begin
  if TG_TABLE_NAME = 'match_requests' then
    if TG_OP = 'INSERT' then
      select full_name into nm from profiles where id=new.sender_id;
      insert into notifications(user_id,title,body,link) values (new.receiver_id,'New match request', coalesce(nm,'A student')||' wants to swap skills with you','/requests');
    elsif new.status <> old.status then
      select full_name into nm from profiles where id=new.receiver_id;
      insert into notifications(user_id,title,body,link) values (new.sender_id,'Request '||new.status, coalesce(nm,'A student')||' '||new.status||' your request','/requests');
    end if;
  elsif TG_TABLE_NAME = 'messages' then
    select case when sender_id=new.sender_id then receiver_id else sender_id end into other from match_requests where id=new.request_id;
    select full_name into nm from profiles where id=new.sender_id;
    insert into notifications(user_id,title,body,link) values (other,'New message from '||coalesce(nm,'a student'), left(new.content,80),'/chat');
  elsif TG_TABLE_NAME = 'sessions' then
    select full_name into nm from profiles where id=new.organizer_id;
    insert into notifications(user_id,title,body,link) values (new.partner_id,'Session scheduled', coalesce(nm,'A student')||' scheduled "'||new.title||'"','/sessions');
  elsif TG_TABLE_NAME = 'reviews' then
    insert into notifications(user_id,title,body,link) values (new.reviewee_id,'New review', 'You received a '||new.rating||'-star review','/profile');
  end if;
  return new;
end $$;
create trigger n_req after insert or update on public.match_requests for each row execute function public.notify_events();
create trigger n_msg after insert on public.messages for each row execute function public.notify_events();
create trigger n_sess after insert on public.sessions for each row execute function public.notify_events();
create trigger n_rev after insert on public.reviews for each row execute function public.notify_events();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;