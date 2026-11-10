import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronDown,
  Clock3, Coffee, Compass, Dumbbell, GraduationCap, Heart, LibraryBig, Leaf, MapPin,
  Monitor, Moon, MoreHorizontal, Search, Sandwich, Sun, Trees, Utensils, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import campusImage from "@/assets/campusflow-courtyard.jpg";
import {
  canReserveSeat, canteenTraffic, createReservation, crowdLevel, defaultAlerts,
  hourlyCrowds, initialPlaces, menuItems, persistAlerts, persistFavorite,
  persistReservation, randomizePlaces, readStored, toggleFavorite,
  type AlertSubscription, type CampusPlace, type Reservation,
} from "@/lib/campusflow-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusFlow — Find your campus rhythm" },
      { name: "description", content: "See live campus crowd levels, find a study spot, and plan your day with CampusFlow." },
      { property: "og:title", content: "CampusFlow — Find your campus rhythm" },
      { property: "og:description", content: "See live campus crowd levels, find a study spot, and plan your day with CampusFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampusFlow,
});

type Section = "home" | "library" | "canteen" | "insights" | "alerts";

const navigation: { id: Section; label: string; icon: typeof Compass }[] = [
  { id: "home", label: "Home", icon: Compass },
  { id: "library", label: "Library", icon: LibraryBig },
  { id: "canteen", label: "Canteen", icon: Coffee },
  { id: "insights", label: "Insights", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell },
];

const iconByName: Record<string, typeof Compass> = {
  utensils: Utensils, library: LibraryBig, dumbbell: Dumbbell,
  monitor: Monitor, "book-open": BookOpen, trees: Trees,
};

function CampusFlow() {
  const [appOpen, setAppOpen] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const [places, setPlaces] = useState(initialPlaces);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [alerts, setAlerts] = useState<AlertSubscription[]>(defaultAlerts);
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [floor, setFloor] = useState(3);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [duration, setDuration] = useState("2");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const storedFavorites = readStored<string[]>(window.localStorage, "campusflow:favorites", []);
    const storedReservation = readStored<Reservation | null>(window.localStorage, "campusflow:reservation", null);
    const storedAlerts = readStored<AlertSubscription[]>(window.localStorage, "campusflow:alerts", defaultAlerts);
    const storedDark = readStored<boolean>(window.localStorage, "campusflow:dark", false);
    setFavorites(storedFavorites);
    setReservation(storedReservation && storedReservation.endsAt > Date.now() ? storedReservation : null);
    setAlerts(storedAlerts);
    setDark(storedDark);
    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", dark);
    try { window.localStorage.setItem("campusflow:dark", JSON.stringify(dark)); } catch { /* Storage is optional. */ }
  }, [dark, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const interval = window.setInterval(() => setPlaces((current) => randomizePlaces(current)), 5000);
    return () => window.clearInterval(interval);
  }, [hydrated]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!reservation || reservation.endsAt > now) return;
    setReservation(null);
    if (hydrated) {
      try { persistReservation(window.localStorage, null); } catch { /* Storage is optional. */ }
      toast.info("Your library reservation has ended.");
    }
  }, [hydrated, now, reservation]);

  const updateFavorites = useCallback((placeId: string) => {
    setFavorites((current) => {
      const next = toggleFavorite(current, placeId);
      try { persistFavorite(window.localStorage, next); } catch { toast.error("Your favorite could not be saved on this device."); }
      return next;
    });
  }, []);

  const updateAlerts = useCallback((id: string, enabled: boolean) => {
    setAlerts((current) => {
      const next = current.map((item) => item.id === id ? { ...item, enabled } : item);
      try { persistAlerts(window.localStorage, next); } catch { toast.error("Your alert preference could not be saved."); }
      return next;
    });
  }, []);

  const totalPeople = places.reduce((total, place) => total + place.people, 0);
  const totalCapacity = places.reduce((total, place) => total + place.capacity, 0);
  const busyPercent = Math.round((totalPeople / totalCapacity) * 100);
  const filteredPlaces = useMemo(() => places.filter((place) => {
    const matchesQuery = `${place.name} ${place.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesQuery && (!favoriteFilter || favorites.includes(place.id));
  }), [favoriteFilter, favorites, places, search]);

  const reserveSelectedSeat = () => {
    if (selectedSeat === null || !canReserveSeat(reservation, Number(duration), now)) {
      toast.error("You already have an active reservation, or the booking details are invalid.");
      return;
    }
    const next = createReservation(floor, selectedSeat, Number(duration), now);
    if (!next) return;
    setReservation(next);
    try { persistReservation(window.localStorage, next); } catch { toast.error("Reservation saved for this session only."); }
    setReserveOpen(false);
    setSelectedSeat(null);
    toast.success(`Seat ${next.seat} on Floor ${next.floor} is yours!`);
  };

  const cancelReservation = () => {
    setReservation(null);
    try { persistReservation(window.localStorage, null); } catch { /* Storage is optional. */ }
    toast("Reservation cancelled");
  };

  const goTo = (id: Section) => {
    setSection(id);
    setSearch("");
    setFavoriteFilter(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {appOpen ? (
        <div className="min-h-screen lg:flex">
          <DesktopSidebar active={section} onNavigate={goTo} />
          <main className="min-w-0 flex-1 pb-24 lg:pb-8">
            <TopBar search={search} setSearch={setSearch} favoriteFilter={favoriteFilter} setFavoriteFilter={setFavoriteFilter} dark={dark} setDark={setDark} favoriteCount={favorites.length} />
            <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 sm:px-7 lg:px-10 lg:pt-8">
              {section === "home" && <HomeSection places={filteredPlaces} allPlaces={places} favorites={favorites} onFavorite={updateFavorites} busyPercent={busyPercent} search={search} onNavigate={goTo} reservation={reservation} now={now} />}
              {section === "library" && <LibrarySection floor={floor} setFloor={setFloor} reservation={reservation} now={now} selectedSeat={selectedSeat} setSelectedSeat={setSelectedSeat} onReserve={() => setReserveOpen(true)} onCancel={cancelReservation} />}
              {section === "canteen" && <CanteenSection place={places.find((place) => place.id === "canteen") ?? initialPlaces[0]} />}
              {section === "insights" && <InsightsSection places={places} />}
              {section === "alerts" && <AlertsSection alerts={alerts} onToggle={updateAlerts} />}
            </div>
          </main>
          <MobileNavigation active={section} onNavigate={goTo} />
          <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reserve your seat</DialogTitle>
                <DialogDescription>Seat {selectedSeat} · Central Library, Floor {floor}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm font-medium">How long would you like to stay?</p>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3"].map((hours) => (
                    <Button key={hours} type="button" variant={duration === hours ? "default" : "outline"} onClick={() => setDuration(hours)} aria-pressed={duration === hours}>
                      {hours} {Number(hours) === 1 ? "hour" : "hours"}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReserveOpen(false)}>Not now</Button>
                <Button onClick={reserveSelectedSeat}><Check aria-hidden="true" />Confirm reservation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <WelcomeScreen busyPercent={busyPercent} places={places} onOpen={() => { setAppOpen(true); setSection("home"); }} />
      )}
    </div>
  );
}

function WelcomeScreen({ busyPercent, places, onOpen }: { busyPercent: number; places: CampusPlace[]; onOpen: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-8 lg:px-12 lg:py-6">
      <header className="flex h-14 items-center justify-between">
        <Brand />
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={onOpen}>Explore campus <ArrowRight aria-hidden="true" /></Button>
        <Button className="sm:hidden" size="sm" onClick={onOpen}>Open App <ArrowRight aria-hidden="true" /></Button>
      </header>
      <main className="flex flex-1 flex-col justify-center pb-3 pt-4">
        <section className="relative isolate flex min-h-[550px] flex-col justify-end overflow-hidden rounded-lg bg-primary p-6 sm:min-h-[610px] sm:p-12 lg:min-h-[650px] lg:p-16">
          <img src={campusImage} alt="Students enjoying the university courtyard in the evening" width={1536} height={1024} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/95 via-primary/55 to-primary/10" />
          <div className="max-w-3xl text-primary-foreground">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary/35 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="live-dot h-2 w-2 rounded-full bg-status-free" /> Your campus, in real time
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] sm:text-6xl">Find your campus rhythm.</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/90 sm:text-lg">Know what’s busy, find a quiet corner, and make every minute between classes count.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="hero" onClick={onOpen}>Open App <ArrowRight aria-hidden="true" /></Button>
              <div className="rounded-lg border border-primary-foreground/25 bg-primary/35 px-4 py-2.5 backdrop-blur-sm">
                <span className="flex items-center gap-2 text-lg font-semibold"><span className="live-dot h-2 w-2 rounded-full bg-status-free" />{busyPercent}% busy</span>
                <span className="mt-0.5 block text-xs text-primary-foreground/80">Across campus right now</span>
              </div>
            </div>
          </div>
          <div className="absolute right-6 top-6 hidden max-w-[245px] rounded-lg border border-primary-foreground/25 bg-background/90 p-4 text-foreground shadow-lg backdrop-blur-md md:block lg:right-12 lg:top-12">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Activity className="h-3.5 w-3.5 text-teal" aria-hidden="true" /> CAMPUS PULSE</p>
            <p className="mt-2 text-3xl font-semibold">{busyPercent}<span className="text-lg text-muted-foreground">%</span></p>
            <p className="text-sm text-muted-foreground">A little room to breathe.</p>
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {places.slice(0, 3).map((place) => <div className="flex items-center justify-between gap-4 text-xs" key={place.id}><span className="truncate">{place.name}</span><span className="font-medium">{Math.round(place.people / place.capacity * 100)}%</span></div>)}
            </div>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-muted-foreground">
          <span>One calmer campus day starts here.</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-teal" aria-hidden="true" /> Campus · Live availability</span>
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Activity className="h-5 w-5" aria-hidden="true" /></span><span className="text-lg font-semibold">CampusFlow</span></div>;
}

function DesktopSidebar({ active, onNavigate }: { active: Section; onNavigate: (section: Section) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col border-r border-border bg-card px-5 py-6 lg:flex">
      <Brand />
      <div className="mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your campus</div>
      <nav aria-label="Main navigation" className="mt-3 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return <Button key={item.id} variant={active === item.id ? "nav-active" : "nav"} className="w-full justify-start" onClick={() => onNavigate(item.id)} aria-current={active === item.id ? "page" : undefined}><Icon aria-hidden="true" />{item.label}</Button>;
        })}
      </nav>
      <div className="mt-auto rounded-lg bg-canvas-tint p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><span className="live-dot h-2 w-2 rounded-full bg-status-free" />All systems live</div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Campus availability refreshes every few seconds.</p>
      </div>
      <p className="mt-4 px-1 text-xs text-muted-foreground">Made for your campus day.</p>
    </aside>
  );
}

function TopBar({ search, setSearch, favoriteFilter, setFavoriteFilter, dark, setDark, favoriteCount }: {
  search: string; setSearch: (value: string) => void; favoriteFilter: boolean;
  setFavoriteFilter: (value: boolean) => void; dark: boolean; setDark: (value: boolean) => void; favoriteCount: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-7 lg:px-10">
        <div className="lg:hidden"><Brand /></div>
        <div className="relative ml-auto w-full max-w-[440px] lg:ml-0">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search campus places" placeholder="Search places…" className="h-10 border-transparent bg-canvas-tint pl-9 pr-9 shadow-none focus-visible:border-ring" />
          {search && <Button variant="icon-quiet" size="icon" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"><X aria-hidden="true" className="h-4 w-4" /></Button>}
        </div>
        <Button variant={favoriteFilter ? "soft" : "icon-quiet"} size="icon" className="relative ml-1 shrink-0" onClick={() => setFavoriteFilter(!favoriteFilter)} aria-label={favoriteFilter ? "Show all places" : `Show ${favoriteCount} favorite places`} aria-pressed={favoriteFilter} title="Favorites">
          <Heart aria-hidden="true" className={favoriteFilter ? "fill-current" : ""} />
          {favoriteCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{favoriteCount}</span>}
        </Button>
        <Button variant="icon-quiet" size="icon" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"} title={dark ? "Light appearance" : "Dark appearance"}>
          {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
        <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground sm:flex" aria-label="Student profile">S</div>
      </div>
    </header>
  );
}

function MobileNavigation({ active, onNavigate }: { active: Section; onNavigate: (section: Section) => void }) {
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-lg lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">
    {navigation.map((item) => { const Icon = item.icon; return <Button key={item.id} variant={active === item.id ? "tab-active" : "tab"} onClick={() => onNavigate(item.id)} aria-current={active === item.id ? "page" : undefined}><Icon aria-hidden="true" /><span>{item.label}</span></Button>; })}
  </div></nav>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-normal sm:text-[30px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function LiveIndicator() {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-status-free/10 px-2 py-1 text-[10px] font-semibold uppercase text-status-free"><span className="live-dot h-1.5 w-1.5 rounded-full bg-status-free" />Live</span>;
}

function crowdLabel(level: ReturnType<typeof crowdLevel>) {
  return level === "free" ? "Plenty of room" : level === "moderate" ? "Moderate" : "Busy";
}

function StatusBadge({ place }: { place: CampusPlace }) {
  const level = crowdLevel(place.people / place.capacity * 100);
  return <Badge variant="status" data-status={level} className="px-2.5 py-1 text-[11px]">{crowdLabel(level)}</Badge>;
}

function HomeSection({ places, allPlaces, favorites, onFavorite, busyPercent, search, onNavigate, reservation, now }: {
  places: CampusPlace[]; allPlaces: CampusPlace[]; favorites: string[]; onFavorite: (id: string) => void;
  busyPercent: number; search: string; onNavigate: (section: Section) => void; reservation: Reservation | null; now: number;
}) {
  const greeting = "Good evening, Student";
  const freePlaces = allPlaces.filter((place) => place.people / place.capacity < 0.45).length;
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">Tuesday, November 10</p><h1 className="mt-1 text-2xl font-semibold sm:text-[30px]">{greeting} <span aria-hidden="true">✦</span></h1><p className="mt-1.5 text-sm text-muted-foreground">Here’s the latest around campus.</p></div><LiveIndicator /></div>
    <section aria-label="Campus summary" className="mb-7 grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card shadow-sm sm:grid-cols-3">
      <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Activity className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm text-muted-foreground">Campus is <strong className="font-semibold text-foreground">{busyPercent}% busy</strong></p><p className="mt-0.5 text-xs text-muted-foreground">A comfortable pace right now</p></div></div>
      <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:border-b-0 sm:border-r sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground"><MapPin className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm font-semibold">{freePlaces} places with room</p><p className="mt-0.5 text-xs text-muted-foreground">Less busy spots to enjoy</p></div></div>
      <div className="flex items-center gap-4 px-5 py-4 sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary"><Clock3 className="h-5 w-5" aria-hidden="true" /></div><div>{reservation ? <><p className="text-sm font-semibold">Seat {reservation.seat} is waiting</p><p className="mt-0.5 text-xs text-muted-foreground">{formatTimeLeft(reservation.endsAt - now)} remaining · Floor {reservation.floor}</p></> : <><p className="text-sm font-semibold">Make your time count</p><button className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => onNavigate("library")}>Find a library seat <ArrowRight className="h-3 w-3" aria-hidden="true" /></button></>}</div></div>
    </section>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Places around campus</h2><p className="mt-1 text-xs text-muted-foreground">Live occupancy, refreshed every few seconds</p></div><span className="text-xs text-muted-foreground">{places.length} places</span></div>
    {places.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{places.map((place) => <PlaceCard key={place.id} place={place} favorite={favorites.includes(place.id)} onFavorite={() => onFavorite(place.id)} />)}</div> : <EmptyState title={search ? "No places match your search" : "No favorite places yet"} description={search ? "Try a different place name or category." : "Star a place to keep it close at hand."} onClear={search ? undefined : undefined} />}
    <section className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Planning your next stop?</h2><p className="mt-1 text-sm text-muted-foreground">A seat, a bite, or a quieter time to visit.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onNavigate("library")}><LibraryBig aria-hidden="true" />Find a seat</Button><Button variant="outline" onClick={() => onNavigate("insights")}><Activity aria-hidden="true" />See trends</Button></div></section>
  </>;
}

function PlaceCard({ place, favorite, onFavorite }: { place: CampusPlace; favorite: boolean; onFavorite: () => void }) {
  const Icon = iconByName[place.icon] ?? MoreHorizontal;
  const occupancy = Math.round(place.people / place.capacity * 100);
  return <Card className="campus-card group rounded-lg border-border/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="truncate text-[11px] text-muted-foreground">{place.category}</p><h3 className="mt-0.5 truncate font-semibold">{place.name}</h3></div><Button variant={favorite ? "favorite-active" : "icon-quiet"} size="icon" className="-mr-1 -mt-1 h-8 w-8 shrink-0" onClick={onFavorite} aria-label={favorite ? `Remove ${place.name} from favorites` : `Add ${place.name} to favorites`} aria-pressed={favorite}><Heart aria-hidden="true" className={favorite ? "fill-current" : ""} /></Button></div>
      <div className="mt-4 flex items-center justify-between gap-3"><StatusBadge place={place} /><span className="text-xs text-muted-foreground">{place.people} <span aria-hidden="true">/</span> {place.capacity} people</span></div>
      <Progress value={occupancy} aria-label={`${occupancy}% occupied`} className="occupancy-track mt-2.5 h-2" data-status={crowdLevel(occupancy)} />
      <div className="mt-3 flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{place.note}</span><span className="shrink-0 text-xs font-medium">{place.waitMinutes ? `~${place.waitMinutes} min wait` : "No wait"}</span></div>
    </CardContent>
  </Card>;
}

function EmptyState({ title, description, onClear }: { title: string; description: string; onClear?: () => void }) {
  return <div className="flex min-h-52 flex-col items-center justify-center border-y border-border px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Search aria-hidden="true" /></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>{onClear && <Button className="mt-4" variant="outline" onClick={onClear}>Clear filters</Button>}</div>;
}

function LibrarySection({ floor, setFloor, reservation, now, selectedSeat, setSelectedSeat, onReserve, onCancel }: {
  floor: number; setFloor: (floor: number) => void; reservation: Reservation | null; now: number;
  selectedSeat: number | null; setSelectedSeat: (seat: number | null) => void; onReserve: () => void; onCancel: () => void;
}) {
  const takenSeats = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const occupied = ((index * 17 + floor * 11) % 13) < 5 || index === 4 || index === 39;
    return occupied ? index + 1 : null;
  }).filter((seat): seat is number => seat !== null), [floor]);
  const freeCount = 48 - takenSeats.length - (reservation?.floor === floor ? 1 : 0);
  return <>
    <PageHeading eyebrow="Find your focus" title="Library seat map" description="Pick an open seat and settle in. Availability updates throughout the day." action={<div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Floor</span><Select value={String(floor)} onValueChange={(value) => { setFloor(Number(value)); setSelectedSeat(null); }}><SelectTrigger className="w-[120px]" aria-label="Select library floor"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3].map((number) => <SelectItem value={String(number)} key={number}>Floor {number}</SelectItem>)}</SelectContent></Select></div>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-xs"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-status-free/50 bg-status-free/10" />Available <strong>{freeCount}</strong></span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-status-crowded/30 bg-status-crowded/10" />Taken</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-primary bg-primary" />Your seat</span></div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground"><span className="live-dot h-2 w-2 rounded-full bg-status-free" />Floor {floor} availability is live</div>
    </div>
    {reservation && <Card className="mb-5 rounded-lg border-primary/25 bg-primary/5"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Check className="h-4 w-4" aria-hidden="true" /></div><div><p className="font-semibold">Your spot is saved</p><p className="mt-1 text-sm text-muted-foreground">Seat {reservation.seat} · Floor {reservation.floor} · <span className="font-medium text-foreground">{formatTimeLeft(reservation.endsAt - now)}</span> left</p></div></div><Button variant="outline" size="sm" onClick={onCancel}>Cancel reservation</Button></CardContent></Card>}
    <Card className="campus-card rounded-lg"><CardContent className="p-4 sm:p-7">
      <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><h2 className="font-semibold">Quiet study zone</h2><p className="mt-1 text-xs text-muted-foreground">Window seats · Floor {floor}</p></div><div className="rounded-md bg-canvas-tint px-3 py-2 text-center"><p className="text-lg font-semibold">{freeCount}</p><p className="text-[10px] text-muted-foreground">seats free</p></div></div>
      <div aria-label={`Library seating on Floor ${floor}`} className="mx-auto grid max-w-[600px] grid-cols-6 gap-2.5 sm:grid-cols-8 sm:gap-3">{Array.from({ length: 48 }, (_, index) => {
        const seat = index + 1;
        const isReserved = reservation?.floor === floor && reservation.seat === seat;
        const isTaken = takenSeats.includes(seat) && !isReserved;
        const isSelected = selectedSeat === seat;
        const seatState = isReserved ? "reserved" : isTaken ? "taken" : isSelected ? "selected" : "free";
        return <button key={seat} type="button" className="seat-button aspect-square min-w-0 rounded-md border text-xs font-medium transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-75" data-seat-state={seatState} disabled={isTaken || isReserved} aria-label={`Seat ${seat}, ${seatState}${!isTaken && !isReserved ? ", available to reserve" : ""}`} aria-pressed={isSelected} onClick={() => setSelectedSeat(isSelected ? null : seat)} title={`Seat ${seat} · ${seatState}`}>{seat}</button>;
      })}</div>
      <div className="mx-auto mt-6 max-w-[600px] rounded-md border border-dashed border-border bg-canvas-tint py-2.5 text-center text-[11px] font-medium uppercase text-muted-foreground">Window seats</div>
      <div className="mx-auto mt-5 flex max-w-[600px] flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{selectedSeat ? `Seat ${selectedSeat} selected · choose reserve when you're ready` : "Choose an available seat to get started"}</span><Button onClick={onReserve} disabled={selectedSeat === null || reservation !== null}><Check aria-hidden="true" />Reserve selected seat</Button></div>
    </CardContent></Card>
    <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">Reservations last up to 3 hours and stay on this device.</p>
  </>;
}

function CanteenSection({ place }: { place: CampusPlace }) {
  const best = [...canteenTraffic].sort((a, b) => a.people - b.people).slice(0, 3);
  return <>
    <PageHeading eyebrow="Good food, less waiting" title="Canteen" description="See what’s cooking and find the best time to grab a bite." action={<LiveIndicator />} />
    <Card className="campus-card mb-6 overflow-hidden rounded-lg border-border/80"><CardContent className="grid gap-0 p-0 sm:grid-cols-3">
      <div className="flex items-center gap-4 px-5 py-5 sm:border-r sm:border-border sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Utensils aria-hidden="true" /></div><div><p className="text-xs text-muted-foreground">In the queue</p><p className="mt-0.5 text-2xl font-semibold">{place.people}<span className="ml-1 text-sm font-normal text-muted-foreground">people</span></p></div></div>
      <div className="flex items-center gap-4 border-t border-border px-5 py-5 sm:border-r sm:border-t-0 sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock3 aria-hidden="true" /></div><div><p className="text-xs text-muted-foreground">Estimated wait</p><p className="mt-0.5 text-2xl font-semibold">~{place.waitMinutes}<span className="ml-1 text-sm font-normal text-muted-foreground">min</span></p></div></div>
      <div className="flex items-center gap-4 border-t border-border px-5 py-5 sm:border-t-0 sm:px-6"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary"><ArrowDownRight aria-hidden="true" /></div><div><p className="text-xs text-muted-foreground">Best time next</p><p className="mt-0.5 text-2xl font-semibold">{best[0]?.hour ?? "3 PM"}</p></div></div>
    </CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="campus-card rounded-lg"><CardContent className="p-4 sm:p-6"><div className="mb-1 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">Best time to visit</h2><p className="mt-1 text-xs text-muted-foreground">Typical queue through the day</p></div><Badge variant="soft">Today</Badge></div>
        <div className="mt-5 h-[250px] w-full" role="img" aria-label="Bar chart of typical canteen queue sizes through the day"><ResponsiveContainer width="100%" height="100%"><BarChart data={canteenTraffic} margin={{ top: 10, right: 6, left: -23, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" /><XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="people" name="People in queue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} /></BarChart></ResponsiveContainer></div>
        <div className="mt-4 flex flex-wrap gap-2">{best.map((slot) => <span key={slot.hour} className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground">{slot.hour} · quieter</span>)}</div>
      </CardContent></Card>
      <Card className="campus-card rounded-lg"><CardContent className="p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold">Today’s menu</h2><p className="mt-1 text-xs text-muted-foreground">Fresh picks from the canteen</p></div><div className="divide-y divide-border">{menuItems.map((item, index) => <MenuRow key={item.name} item={item} index={index} />)}</div></CardContent></Card>
    </div>
  </>;
}

function MenuRow({ item, index }: { item: (typeof menuItems)[number]; index: number }) {
  const icons = [Leaf, Sun, Sandwich, Coffee];
  const Icon = icons[index] ?? Leaf;
  return <div className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-medium">{item.name}</p>{index === 0 && <Badge variant="soft" className="text-[9px]">{item.tag}</Badge>}</div><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div><span className="shrink-0 text-sm font-semibold">{item.price}</span></div>;
}

const insightPlaces = [
  { id: "library", name: "Library", key: "library", color: "var(--chart-1)" },
  { id: "canteen", name: "Canteen", key: "canteen", color: "var(--chart-2)" },
  { id: "gym", name: "Gym", key: "gym", color: "var(--chart-3)" },
  { id: "computer-lab", name: "Computer Lab", key: "lab", color: "var(--chart-4)" },
  { id: "study-rooms", name: "Study Rooms", key: "study", color: "var(--chart-5)" },
  { id: "sports-ground", name: "Sports Ground", key: "ground", color: "var(--teal)" },
];

function InsightsSection({ places }: { places: CampusPlace[] }) {
  const [selected, setSelected] = useState("all");
  const visible = selected === "all" ? insightPlaces : insightPlaces.filter((place) => place.id === selected);
  return <>
    <PageHeading eyebrow="Know before you go" title="Campus insights" description="Typical crowd levels today, with a quieter hour for every place." action={<Select value={selected} onValueChange={setSelected}><SelectTrigger className="w-[180px]" aria-label="Filter insights by place"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All places</SelectItem>{insightPlaces.map((place) => <SelectItem key={place.id} value={place.id}>{place.name}</SelectItem>)}</SelectContent></Select>} />
    <Card className="campus-card mb-6 rounded-lg"><CardContent className="p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">Crowd levels through the day</h2><p className="mt-1 text-xs text-muted-foreground">Share of each place’s capacity · typical weekday</p></div><Badge variant="soft" className="gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-status-free" />Live right now</Badge></div>
      <div className="mt-5 h-[300px] w-full sm:h-[370px]" role="img" aria-label="Line chart showing crowd levels by place from 8 AM to 7 PM"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourlyCrowds} margin={{ top: 8, right: 10, left: -23, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" /><XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} formatter={(value) => [`${value}%`, "Crowd"]} /><Line type="monotone" dataKey="library" name="Library" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "library")} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="canteen" name="Canteen" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "canteen")} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="gym" name="Gym" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "gym")} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="lab" name="Computer Lab" stroke="var(--chart-4)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "lab")} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="study" name="Study Rooms" stroke="var(--chart-5)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "study")} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="ground" name="Sports Ground" stroke="var(--teal)" strokeWidth={2.5} dot={false} hide={!visible.some((item) => item.key === "ground")} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4">{visible.map((place) => <span key={place.id} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: place.color }} />{place.name}</span>)}</div>
    </CardContent></Card>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-semibold">Quieter hours</h2><p className="mt-1 text-xs text-muted-foreground">Typical calm moments to plan around</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{places.filter((place) => selected === "all" || place.id === selected).map((place) => <QuietHourCard key={place.id} place={place} />)}</div>
  </>;
}

function QuietHourCard({ place }: { place: CampusPlace }) {
  const icon = insightPlaces.find((item) => item.id === place.id);
  const quietHours = hourlyCrowds.map((slot) => ({ hour: slot.hour, count: Number(slot[icon?.key as keyof typeof slot] ?? 0) })).sort((a, b) => a.count - b.count).slice(0, 2);
  const Icon = iconByName[place.icon] ?? Compass;
  return <Card className="rounded-lg border-border/80"><CardContent className="flex items-start gap-3 p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><Icon aria-hidden="true" className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{place.name}</p><p className="mt-1 text-xs text-muted-foreground">Usually quieter around</p><div className="mt-2 flex flex-wrap gap-1.5">{quietHours.map((slot) => <Badge key={slot.hour} variant="soft" className="text-[10px]">{slot.hour}</Badge>)}</div></div><div className="flex items-center gap-1 pt-1 text-xs font-medium text-status-free"><ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />Quiet</div></CardContent></Card>;
}

function AlertsSection({ alerts, onToggle }: { alerts: AlertSubscription[]; onToggle: (id: string, enabled: boolean) => void }) {
  return <>
    <PageHeading eyebrow="Stay in the loop" title="Campus alerts" description="Choose which moments you’d like us to keep an eye on." />
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="campus-card rounded-lg"><CardContent className="p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold">Your alerts</h2><p className="mt-1 text-xs text-muted-foreground">Preferences are saved on this device.</p></div><div className="divide-y divide-border">{alerts.map((alert, index) => <AlertPreference key={alert.id} alert={alert} index={index} onToggle={onToggle} />)}</div></CardContent></Card>
      <div className="space-y-6"><Card className="rounded-lg"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground"><Bell aria-hidden="true" /></div><div><h2 className="font-semibold">What’s happening</h2><p className="text-xs text-muted-foreground">A little campus pulse</p></div></div><div className="mt-4 divide-y divide-border"><ActivityItem icon={<LibraryBig aria-hidden="true" />} title="Open study spots" detail="18 seats available on Library Floor 3" time="Just now" tone="teal" /><ActivityItem icon={<Utensils aria-hidden="true" />} title="Lunch rush is easing" detail="Canteen wait is down to about 8 minutes" time="2 min ago" tone="amber" /><ActivityItem icon={<Dumbbell aria-hidden="true" />} title="Gym is looking good" detail="Cardio machines are available" time="6 min ago" tone="green" /></div></CardContent></Card>
      <div className="flex gap-3 rounded-lg border border-border bg-canvas-tint p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-primary"><Heart aria-hidden="true" className="h-4 w-4" /></div><p className="text-xs leading-relaxed text-muted-foreground">Favorite a place from Home to keep track of the spots you visit most.</p></div></div>
    </div>
  </>;
}

function AlertPreference({ alert, index, onToggle }: { alert: AlertSubscription; index: number; onToggle: (id: string, enabled: boolean) => void }) {
  const icons = [LibraryBig, Utensils, Dumbbell];
  const Icon = icons[index % icons.length] ?? Bell;
  return <div className="flex items-center gap-3 py-4 first:pt-1 last:pb-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><Icon aria-hidden="true" className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium leading-snug">{alert.label}</p><p className="mt-1 text-xs text-muted-foreground">{alert.enabled ? "You’ll be notified when it changes" : "Notifications are paused"}</p></div><Switch checked={alert.enabled} onCheckedChange={(checked) => onToggle(alert.id, checked)} aria-label={`${alert.enabled ? "Turn off" : "Turn on"} alert: ${alert.label}`} /></div>;
}

function ActivityItem({ icon, title, detail, time, tone }: { icon: React.ReactNode; title: string; detail: string; time: string; tone: "teal" | "amber" | "green" }) {
  return <div className="flex gap-3 py-3.5"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone === "teal" ? "bg-accent text-accent-foreground" : tone === "amber" ? "bg-status-moderate/10 text-status-moderate" : "bg-status-free/10 text-status-free"}`}>{icon}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-2"><p className="text-xs font-semibold">{title}</p><span className="text-[10px] text-muted-foreground">{time}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div></div>;
}

function formatTimeLeft(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}