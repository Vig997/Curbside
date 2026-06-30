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

drop trigger if exists set_reservation_guests_updated_at on public.reservation_guests;
create trigger set_reservation_guests_updated_at
before update on public.reservation_guests
for each row
execute function public.set_updated_at();
