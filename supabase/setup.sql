create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  location_notes text not null,
  spot_type text not null check (spot_type in ('driveway', 'garage', 'apartment_spot', 'covered_lot', 'uncovered_lot')),
  price_per_hour numeric(10,2) not null check (price_per_hour >= 0),
  covered boolean not null default false,
  has_ev_charger boolean not null default false,
  vehicle_size_restrictions text not null,
  access_instructions text not null,
  latitude double precision not null,
  longitude double precision not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spot_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.parking_spots(id) on delete cascade,
  url text not null,
  storage_path text not null unique,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.parking_spots(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  repeat_daily boolean not null default false,
  overnight_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint availability_window_valid check (end_at > start_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.parking_spots(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10,2) not null check (total_price >= 0),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  time_slot tstzrange generated always as (tstzrange(start_time, end_time, '[)')) stored,
  constraint booking_time_valid check (end_time > start_time)
);

alter table public.parking_spots
add column if not exists location_notes text not null default '';

alter table public.parking_spots
add column if not exists spot_type text;

alter table public.parking_spots
add column if not exists covered boolean not null default false;

alter table public.parking_spots
add column if not exists has_ev_charger boolean not null default false;

alter table public.parking_spots
add column if not exists vehicle_size_restrictions text not null default '';

alter table public.parking_spots
add column if not exists access_instructions text not null default '';

alter table public.parking_spots
add column if not exists latitude double precision;

alter table public.parking_spots
add column if not exists longitude double precision;

alter table public.parking_spots
add column if not exists is_published boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_spots'
      and column_name = 'availability'
  ) then
    alter table public.parking_spots
    alter column availability drop not null;
  end if;
end
$$;

alter table public.parking_spots
alter column spot_type set default 'driveway';

update public.parking_spots
set spot_type = 'driveway'
where spot_type is null;

alter table public.parking_spots
alter column spot_type set not null;

alter table public.parking_spots
drop constraint if exists parking_spots_spot_type_check;

alter table public.parking_spots
add constraint parking_spots_spot_type_check
check (spot_type in ('driveway', 'garage', 'apartment_spot', 'covered_lot', 'uncovered_lot'));

alter table public.spot_photos
add column if not exists storage_path text;

alter table public.spot_photos
add column if not exists is_primary boolean not null default false;

alter table public.spot_photos
add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spot_photos_storage_path_key'
      and conrelid = 'public.spot_photos'::regclass
  ) then
    alter table public.spot_photos
    add constraint spot_photos_storage_path_key unique (storage_path);
  end if;
end
$$;

alter table public.bookings
add column if not exists total_price numeric(10,2) not null default 0;

alter table public.bookings
add column if not exists status text not null default 'confirmed';

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'time_slot'
  ) then
    alter table public.bookings
    add column time_slot tstzrange generated always as (tstzrange(start_time, end_time, '[)')) stored;
  end if;
end
$$;

alter table public.bookings
drop constraint if exists bookings_status_check;

alter table public.bookings
add constraint bookings_status_check
check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

alter table public.bookings
drop constraint if exists booking_time_valid;

alter table public.bookings
add constraint booking_time_valid check (end_time > start_time);

alter table public.bookings
drop constraint if exists bookings_no_overlaps;

alter table public.bookings
add constraint bookings_no_overlaps
exclude using gist (
  spot_id with =,
  time_slot with &&
)
where (status in ('pending', 'confirmed'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Curbside User'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_parking_spots_updated_at on public.parking_spots;
create trigger set_parking_spots_updated_at
before update on public.parking_spots
for each row
execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.parking_spots enable row level security;
alter table public.spot_photos enable row level security;
alter table public.availability_windows enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
on public.profiles
for select
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check ((select auth.uid()) = id);

insert into public.profiles (id, full_name, avatar_url, email)
select
  users.id,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Curbside User'
  ),
  users.raw_user_meta_data ->> 'avatar_url',
  users.email
from auth.users as users
on conflict (id) do update
set
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  email = excluded.email,
  updated_at = now();

drop policy if exists "Public can read published parking spots" on public.parking_spots;
create policy "Public can read published parking spots"
on public.parking_spots
for select
using (is_published = true or (select auth.uid()) = owner_id);

drop policy if exists "Authenticated users can create parking spots" on public.parking_spots;
create policy "Authenticated users can create parking spots"
on public.parking_spots
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Hosts can update their own parking spots" on public.parking_spots;
create policy "Hosts can update their own parking spots"
on public.parking_spots
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Hosts can delete their own parking spots" on public.parking_spots;
create policy "Hosts can delete their own parking spots"
on public.parking_spots
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Public can read spot photos for published spots" on public.spot_photos;
create policy "Public can read spot photos for published spots"
on public.spot_photos
for select
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = spot_photos.spot_id
      and (public.parking_spots.is_published = true or public.parking_spots.owner_id = (select auth.uid()))
  )
);

drop policy if exists "Hosts manage photos for own spots" on public.spot_photos;
create policy "Hosts manage photos for own spots"
on public.spot_photos
for all
to authenticated
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = spot_photos.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = spot_photos.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
);

drop policy if exists "Public can read availability for published spots" on public.availability_windows;
create policy "Public can read availability for published spots"
on public.availability_windows
for select
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = availability_windows.spot_id
      and (public.parking_spots.is_published = true or public.parking_spots.owner_id = (select auth.uid()))
  )
);

drop policy if exists "Hosts manage availability for own spots" on public.availability_windows;
create policy "Hosts manage availability for own spots"
on public.availability_windows
for all
to authenticated
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = availability_windows.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = availability_windows.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
);

drop policy if exists "Drivers can read their own bookings" on public.bookings;
create policy "Drivers can read their own bookings"
on public.bookings
for select
to authenticated
using ((select auth.uid()) = driver_id);

drop policy if exists "Hosts can read bookings for their spots" on public.bookings;
create policy "Hosts can read bookings for their spots"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = bookings.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
);

drop policy if exists "Drivers can create bookings" on public.bookings;
create policy "Drivers can create bookings"
on public.bookings
for insert
to authenticated
with check ((select auth.uid()) = driver_id);

drop policy if exists "Drivers can update their own bookings" on public.bookings;
create policy "Drivers can update their own bookings"
on public.bookings
for update
to authenticated
using ((select auth.uid()) = driver_id)
with check ((select auth.uid()) = driver_id);

drop policy if exists "Drivers can delete their own bookings" on public.bookings;
create policy "Drivers can delete their own bookings"
on public.bookings
for delete
to authenticated
using ((select auth.uid()) = driver_id);

drop policy if exists "Hosts can delete bookings for their spots" on public.bookings;
create policy "Hosts can delete bookings for their spots"
on public.bookings
for delete
to authenticated
using (
  exists (
    select 1
    from public.parking_spots
    where public.parking_spots.id = bookings.spot_id
      and public.parking_spots.owner_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parking-spot-images',
  'parking-spot-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Public can view parking spot images" on storage.objects;
create policy "Public can view parking spot images"
on storage.objects
for select
using (bucket_id = 'parking-spot-images');

drop policy if exists "Authenticated users can upload parking spot images" on storage.objects;
create policy "Authenticated users can upload parking spot images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'parking-spot-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their parking spot images" on storage.objects;
create policy "Users can update their parking spot images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'parking-spot-images'
  and owner = (select auth.uid())
)
with check (
  bucket_id = 'parking-spot-images'
  and owner = (select auth.uid())
);

drop policy if exists "Users can delete their parking spot images" on storage.objects;
create policy "Users can delete their parking spot images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'parking-spot-images'
  and owner = (select auth.uid())
);

alter table public.profiles
add column if not exists phone text;

alter table public.profiles
add column if not exists address text;

alter table public.profiles
add column if not exists vehicle_info text;

alter table public.bookings
add column if not exists guest_name text;

alter table public.bookings
add column if not exists guest_email text;

alter table public.bookings
add column if not exists guest_phone text;

alter table public.bookings
add column if not exists guest_address text;

alter table public.bookings
add column if not exists guest_vehicle_info text;

alter table public.bookings
add column if not exists guest_contact jsonb not null default '{}'::jsonb;

create table if not exists public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  demo_spot_id text not null,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10,2) not null check (total_price >= 0),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  guest_name text,
  guest_email text,
  guest_phone text,
  guest_address text,
  guest_vehicle_info text,
  guest_contact jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_booking_time_valid check (end_time > start_time)
);

alter table public.demo_bookings enable row level security;

drop policy if exists "Drivers can read their demo bookings" on public.demo_bookings;
create policy "Drivers can read their demo bookings"
on public.demo_bookings
for select
to authenticated
using ((select auth.uid()) = driver_id);

drop policy if exists "Drivers can create demo bookings" on public.demo_bookings;
create policy "Drivers can create demo bookings"
on public.demo_bookings
for insert
to authenticated
with check ((select auth.uid()) = driver_id);

drop policy if exists "Drivers can delete their demo bookings" on public.demo_bookings;
create policy "Drivers can delete their demo bookings"
on public.demo_bookings
for delete
to authenticated
using ((select auth.uid()) = driver_id);

drop trigger if exists set_demo_bookings_updated_at on public.demo_bookings;
create trigger set_demo_bookings_updated_at
before update on public.demo_bookings
for each row
execute function public.set_updated_at();

create table if not exists public.reservation_guests (
  booking_id text primary key,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  vehicle_info text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservation_guests enable row level security;

drop policy if exists "Drivers can save reservation guest details" on public.reservation_guests;
create policy "Drivers can save reservation guest details"
on public.reservation_guests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bookings
    where bookings.id::text = reservation_guests.booking_id
      and bookings.driver_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.demo_bookings
    where demo_bookings.id::text = reservation_guests.booking_id
      and demo_bookings.driver_id = (select auth.uid())
  )
);

drop policy if exists "Drivers can update reservation guest details" on public.reservation_guests;
create policy "Drivers can update reservation guest details"
on public.reservation_guests
for update
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id::text = reservation_guests.booking_id
      and bookings.driver_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.demo_bookings
    where demo_bookings.id::text = reservation_guests.booking_id
      and demo_bookings.driver_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.bookings
    where bookings.id::text = reservation_guests.booking_id
      and bookings.driver_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.demo_bookings
    where demo_bookings.id::text = reservation_guests.booking_id
      and demo_bookings.driver_id = (select auth.uid())
  )
);

drop policy if exists "Hosts and drivers can read reservation guest details" on public.reservation_guests;
create policy "Hosts and drivers can read reservation guest details"
on public.reservation_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.parking_spots on parking_spots.id = bookings.spot_id
    where bookings.id::text = reservation_guests.booking_id
      and (bookings.driver_id = (select auth.uid()) or parking_spots.owner_id = (select auth.uid()))
  )
  or exists (
    select 1
    from public.demo_bookings
    where demo_bookings.id::text = reservation_guests.booking_id
      and demo_bookings.driver_id = (select auth.uid())
  )
);

drop policy if exists "Hosts and drivers can delete reservation guest details" on public.reservation_guests;
create policy "Hosts and drivers can delete reservation guest details"
on public.reservation_guests
for delete
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.parking_spots on parking_spots.id = bookings.spot_id
    where bookings.id::text = reservation_guests.booking_id
      and (bookings.driver_id = (select auth.uid()) or parking_spots.owner_id = (select auth.uid()))
  )
  or exists (
    select 1
    from public.demo_bookings
    where demo_bookings.id::text = reservation_guests.booking_id
      and demo_bookings.driver_id = (select auth.uid())
  )
);

drop trigger if exists set_reservation_guests_updated_at on public.reservation_guests;
create trigger set_reservation_guests_updated_at
before update on public.reservation_guests
for each row
execute function public.set_updated_at();
