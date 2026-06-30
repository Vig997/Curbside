-- Optional sample spots for the explore map.
-- These are DEMO data only. They are tagged in the app by their fixed IDs
-- and will NOT appear under Host → Your listings.
-- Tip: only run this if you want extra map markers for testing.

do $$
declare
  seed_owner_id uuid;
begin
  select id
  into seed_owner_id
  from auth.users
  order by created_at desc
  limit 1;

  if seed_owner_id is null then
    raise exception 'No auth user found. Sign in to the app once, then rerun this script.';
  end if;

  insert into public.profiles (id, full_name, avatar_url, email)
  values (seed_owner_id, 'Curbside Example Host', null, null)
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.parking_spots (
    id,
    owner_id,
    title,
    description,
    location_notes,
    spot_type,
    price_per_hour,
    covered,
    has_ev_charger,
    vehicle_size_restrictions,
    access_instructions,
    latitude,
    longitude,
    is_published
  )
  values
    (
      '11111111-1111-4111-8111-111111111111',
      seed_owner_id,
      'Driveway spot near Del Playa',
      'Reliable neighborhood parking with quick access to Isla Vista and UCSB destinations. Easy beachside access for short visits and weekend afternoons.',
      'Del Playa Dr, a short walk from the bluffside apartments',
      'driveway',
      10.00,
      false,
      false,
      'Best for compact cars and midsize sedans',
      'Pull in nose-first and keep the left walkway clear. Host will confirm the exact stall after booking.',
      34.4098,
      -119.8617,
      true
    ),
    (
      '22222222-2222-4222-8222-222222222222',
      seed_owner_id,
      'Apartment parking near Pardall',
      'Apartment complex guest space close to cafes, takeout, and the main Isla Vista strip.',
      'Near Pardall Rd and Embarcadero del Mar',
      'apartment_spot',
      8.00,
      false,
      false,
      'Fits sedans and small SUVs',
      'Enter the side lot from the alley and park in the guest-marked space. Host contact is shared after booking.',
      34.4119,
      -119.8554,
      true
    ),
    (
      '33333333-3333-4333-8333-333333333333',
      seed_owner_id,
      'Covered garage near Camino Pescadero',
      'Sheltered garage access for classes, grocery stops, and evening plans in the heart of IV.',
      'Camino Pescadero, two blocks from IV Theater',
      'garage',
      12.00,
      true,
      false,
      'Low-profile SUVs only, max height 6''6"',
      'Use the keypad at the garage gate. The code appears in the booking confirmation.',
      34.4146,
      -119.8502,
      true
    ),
    (
      '44444444-4444-4444-8444-444444444444',
      seed_owner_id,
      'EV charging spot near UCSB campus',
      'Level 2 charger access with a clean pull-in space convenient for campus classes and library runs.',
      'South of El Colegio near UCSB east edge',
      'covered_lot',
      14.00,
      true,
      true,
      'Any standard passenger vehicle',
      'Back into the marked EV stall and plug in using the host-provided charger at arrival.',
      34.4171,
      -119.8458,
      true
    ),
    (
      '55555555-5555-4555-8555-555555555555',
      seed_owner_id,
      'Overnight spot near El Colegio',
      'Simple overnight parking option with easy in-and-out access for late arrivals and weekend stays.',
      'El Colegio Rd near Camino Corto',
      'uncovered_lot',
      9.00,
      false,
      false,
      'Any passenger vehicle under 19 feet',
      'Park in the numbered stall beside the front hedge. Avoid blocking the dumpster lane.',
      34.4194,
      -119.8531,
      true
    )
  on conflict (id) do update
  set
    owner_id = excluded.owner_id,
    title = excluded.title,
    description = excluded.description,
    location_notes = excluded.location_notes,
    spot_type = excluded.spot_type,
    price_per_hour = excluded.price_per_hour,
    covered = excluded.covered,
    has_ev_charger = excluded.has_ev_charger,
    vehicle_size_restrictions = excluded.vehicle_size_restrictions,
    access_instructions = excluded.access_instructions,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_published = excluded.is_published,
    updated_at = now();

  delete from public.spot_photos
  where spot_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  );

  insert into public.spot_photos (spot_id, url, storage_path, is_primary, sort_order)
  values
    ('11111111-1111-4111-8111-111111111111', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', 'example-spots/del-playa-driveway.jpg', true, 0),
    ('22222222-2222-4222-8222-222222222222', 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80', 'example-spots/pardall-apartment.jpg', true, 0),
    ('33333333-3333-4333-8333-333333333333', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80', 'example-spots/camino-garage.jpg', true, 0),
    ('44444444-4444-4444-8444-444444444444', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80', 'example-spots/ucsb-ev.jpg', true, 0),
    ('55555555-5555-4555-8555-555555555555', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80', 'example-spots/el-colegio-overnight.jpg', true, 0);

  delete from public.availability_windows
  where spot_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  );

  insert into public.availability_windows (
    spot_id,
    start_at,
    end_at,
    repeat_daily,
    overnight_allowed
  )
  values
    ('11111111-1111-4111-8111-111111111111', '2026-05-23T08:00:00.000Z', '2026-05-24T06:00:00.000Z', true, true),
    ('22222222-2222-4222-8222-222222222222', '2026-05-23T15:00:00.000Z', '2026-05-24T05:00:00.000Z', true, true),
    ('33333333-3333-4333-8333-333333333333', '2026-05-23T16:00:00.000Z', '2026-05-24T04:00:00.000Z', true, false),
    ('44444444-4444-4444-8444-444444444444', '2026-05-23T07:00:00.000Z', '2026-05-24T07:00:00.000Z', true, true),
    ('55555555-5555-4555-8555-555555555555', '2026-05-23T18:00:00.000Z', '2026-05-24T09:00:00.000Z', true, true);
end $$;
