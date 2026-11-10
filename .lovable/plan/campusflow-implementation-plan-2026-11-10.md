# CampusFlow implementation plan

## Product experience
- Replace the blank home route with CampusFlow: a polished welcome screen with an “Open App” action and the usable campus tracker immediately behind it.
- Build a responsive app shell with desktop sidebar and mobile bottom tabs for Home, Library, Canteen, Insights, and Alerts; include global place search, favorites, live status, and a light/dark toggle.
- Use realistic local mock data for six campus locations. Refresh occupancy every five seconds, show accessible free/moderate/crowded states, queue and wait estimates, skeleton and empty states.
- Implement floor-selectable seat grids with accessible seat selection, 1–3 hour reservations, confirmation feedback, countdown, cancellation, and local persistence for reservations and favorites.
- Add canteen menu and hourly “Best time to visit” chart, daily place-level crowd insights with quietest-hour suggestions, and configurable alert subscriptions with a notification list.

## Visual direction
- Use the requested indigo and teal palette, semantic green/amber/red crowd states, Inter typography, compact rounded surfaces, and restrained motion.
- Establish semantic light and dark design tokens in the global stylesheet; use the existing shadcn-compatible controls and Lucide icons throughout.
- Keep layouts mobile-first, keyboard-friendly, and readable with contrast-conscious labels beyond color alone.

## Technical approach
- Keep the app frontend-only; do not enable Cloud, auth, or remote data services.
- Implement the experience in the existing TanStack Start home route with client-side view selection and browser storage accessed only after hydration.
- Use Recharts for the canteen and insights charts; keep generated/mock data deterministic except the five-second occupancy updates.
- Add focused tests for the local reservation and favorite persistence rules, then verify routing, key interactions, and preview build diagnostics.
