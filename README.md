# Campus Crowd Companion

Build a responsive, mobile-first web app called "CampusFlow", a live campus crowd and availability tracker for students. Frontend only, use realistic mock data, no backend or login required. Tech: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, lucide-react icons. DESIGN: Modern, clean, friendly. Primary color indigo (#4F46E5), accent teal. Status colors: green = free, amber = moderate, red = crowded. Rounded cards, soft shadows, Inter font, light and dark mode toggle. Smooth hover and transition animations. Bottom tab bar on mobile, sidebar on desktop. PAGES: 1. Home Dashboard: greeting header "Good evening, Student", a campus summary strip (e.g. "Campus is 62% busy"), and cards for Canteen, Central Library, Gym, Computer Lab, Study Rooms, Sports Ground. Each card shows an occupancy progress bar, a status badge, current people vs. capacity, and estimated wait time. Occupancy values should update randomly every 5 seconds to look live, with a small pulsing "LIVE" indicator. 2. Library Seat Map: floor selector (Floors 1-3). Show a grid of seats (green = free, red = taken, blue = my reservation). Clicking a free seat opens a modal to reserve for 1, 2 or 3 hours with a confirm button and a success toast. Show a countdown for the active reservation and a "Cancel" option. 3. Canteen: live queue length, estimated wait, a bar chart "Best time to visit" by hour, and a today's menu list with a "Popular now" tag. 4. Insights page: line chart of crowd levels throughout the day for each place, plus the "quietest hour" recommendation per place. 5. Alerts: a notification list and toggles to subscribe to alerts, e.g. "Notify me when the Library 3rd floor has more than 10 free seats." EXTRAS: Favorites (star a place), search bar, skeleton loaders, empty states, fully responsive, accessible color contrast. Persist reservations and favorites in localStorage. Add a polished landing hero with a "Open App" button.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://campus-crowd-companion.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/50042987-1bd2-4404-8733-9e9d92055893).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
