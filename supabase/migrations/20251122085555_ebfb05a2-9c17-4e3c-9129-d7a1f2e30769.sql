-- Create users profile table with required fields
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  skill_level text,
  city text,
  user_role text default 'player',
  club_id text,
  created_at timestamp with time zone default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profiles policies - users can read all profiles, but only update their own
create policy "Anyone can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Create practice_lobbies table
create table public.practice_lobbies (
  id uuid default gen_random_uuid() primary key,
  created_by_user_id uuid references public.profiles(id) on delete cascade not null,
  date timestamp with time zone not null,
  location_name text not null,
  match_format text not null check (match_format in ('Singles', 'Doubles', 'Mixed Doubles')),
  match_tag text check (match_tag in ('Friendly', 'Competitive', 'Practice', 'Tournament')),
  status text default 'pending' not null,
  score_team_a text,
  score_team_b text,
  winning_team text check (winning_team in ('A', 'B', 'Draw')),
  notes text,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS for practice_lobbies
alter table public.practice_lobbies enable row level security;

-- Practice lobbies policies - all authenticated users can CRUD
create policy "Authenticated users can view lobbies"
  on public.practice_lobbies for select
  to authenticated
  using (true);

create policy "Authenticated users can create lobbies"
  on public.practice_lobbies for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update lobbies"
  on public.practice_lobbies for update
  to authenticated
  using (true);

create policy "Authenticated users can delete lobbies"
  on public.practice_lobbies for delete
  to authenticated
  using (true);

-- Create lobby_players table
create table public.lobby_players (
  id uuid default gen_random_uuid() primary key,
  lobby_id uuid references public.practice_lobbies(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team text check (team in ('A', 'B')),
  is_creator boolean default false not null,
  has_confirmed boolean default false not null,
  result text default 'none' not null check (result in ('none', 'win', 'loss', 'draw')),
  created_at timestamp with time zone default now()
);

-- Enable RLS for lobby_players
alter table public.lobby_players enable row level security;

-- Lobby players policies - all authenticated users can CRUD
create policy "Authenticated users can view lobby players"
  on public.lobby_players for select
  to authenticated
  using (true);

create policy "Authenticated users can add players to lobbies"
  on public.lobby_players for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update lobby players"
  on public.lobby_players for update
  to authenticated
  using (true);

create policy "Authenticated users can remove players from lobbies"
  on public.lobby_players for delete
  to authenticated
  using (true);

-- Create indexes for better performance
create index idx_lobby_players_lobby_id on public.lobby_players(lobby_id);
create index idx_lobby_players_user_id on public.lobby_players(user_id);
create index idx_practice_lobbies_status on public.practice_lobbies(status);
create index idx_practice_lobbies_created_by on public.practice_lobbies(created_by_user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substring(new.id::text from 1 for 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Player')
  );
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();