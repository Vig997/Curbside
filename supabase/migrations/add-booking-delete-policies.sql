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

drop policy if exists "Drivers can delete their demo bookings" on public.demo_bookings;
create policy "Drivers can delete their demo bookings"
on public.demo_bookings
for delete
to authenticated
using ((select auth.uid()) = driver_id);

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
