# Manual test checklist

Run through these before pushing to GitHub. Test at `http://localhost:3000`.

## Auth

- [ ] Sign in with Google works
- [ ] Sign out works
- [ ] `/bookings` and `/host` redirect to sign-in when logged out

## Explore map

- [ ] Map loads with markers
- [ ] Demo badge shows on demo/seed spots
- [ ] "Your listing" badge shows only on your real published spots
- [ ] Filters (price, type, covered, EV) narrow markers
- [ ] Clicking a marker loads spot details in the side panel
- [ ] Location search (e.g. "isla vista") flies the map

## Reserve

- [ ] Reserve flow opens from spot card
- [ ] Guest form saves contact fields
- [ ] After booking, spot shows as Reserved on the map

## Bookings (driver)

- [ ] `/bookings` lists your reservations
- [ ] Detail page shows access instructions
- [ ] Delete reservation works

## Host dashboard

- [ ] Only your real listings appear under "Your listings" (not seed demos)
- [ ] Publish / unpublish works
- [ ] Delete listing works (when not reserved)
- [ ] Cannot unpublish or delete while spot is reserved
- [ ] Spot reservations list shows guest name
- [ ] View guest page shows contact fields
- [ ] Remove guest works from detail page

## Performance

- [ ] Hard refresh `/explore` — map loads without long hang
- [ ] Hard refresh `/host` — dashboard loads reasonably fast
- [ ] Tab switch between pages feels snappy
- [ ] No errors in browser console

## Mobile

- [ ] Resize to 375px width — map and forms are usable

## Build

```bash
npm run lint
npx tsc --noEmit
npm run build
```

All three should pass.
