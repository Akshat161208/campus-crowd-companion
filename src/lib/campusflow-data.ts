export type CrowdLevel = "free" | "moderate" | "crowded";

export type CampusPlace = {
  id: string;
  name: string;
  category: string;
  icon: string;
  people: number;
  capacity: number;
  waitMinutes: number;
  note: string;
};

export type Reservation = {
  floor: number;
  seat: number;
  startedAt: number;
  endsAt: number;
};

export type AlertSubscription = {
  id: string;
  label: string;
  enabled: boolean;
};

export const initialPlaces: CampusPlace[] = [
  { id: "canteen", name: "Canteen", category: "Food & drink", icon: "utensils", people: 124, capacity: 220, waitMinutes: 8, note: "Lunch rush is easing" },
  { id: "library", name: "Central Library", category: "Study spaces", icon: "library", people: 286, capacity: 420, waitMinutes: 0, note: "18 seats available on Floor 3" },
  { id: "gym", name: "Campus Gym", category: "Fitness", icon: "dumbbell", people: 38, capacity: 80, waitMinutes: 5, note: "All cardio machines available" },
  { id: "computer-lab", name: "Computer Lab", category: "Study spaces", icon: "monitor", people: 44, capacity: 64, waitMinutes: 0, note: "Plenty of computers free" },
  { id: "study-rooms", name: "Study Rooms", category: "Study spaces", icon: "book-open", people: 16, capacity: 24, waitMinutes: 12, note: "2 rooms available to book" },
  { id: "sports-ground", name: "Sports Ground", category: "Outdoors", icon: "trees", people: 43, capacity: 120, waitMinutes: 0, note: "Good conditions for a game" },
];

export const timeSlots = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM"];

export const hourlyCrowds = [
  { hour: "8 AM", canteen: 12, library: 32, gym: 9, lab: 18, study: 14, ground: 7 },
  { hour: "9 AM", canteen: 18, library: 48, gym: 16, lab: 48, study: 32, ground: 12 },
  { hour: "10 AM", canteen: 23, library: 68, gym: 26, lab: 72, study: 54, ground: 18 },
  { hour: "11 AM", canteen: 34, library: 78, gym: 38, lab: 78, study: 64, ground: 30 },
  { hour: "12 PM", canteen: 86, library: 74, gym: 48, lab: 70, study: 68, ground: 38 },
  { hour: "1 PM", canteen: 92, library: 80, gym: 57, lab: 66, study: 72, ground: 46 },
  { hour: "2 PM", canteen: 62, library: 83, gym: 71, lab: 84, study: 78, ground: 52 },
  { hour: "3 PM", canteen: 48, library: 86, gym: 78, lab: 81, study: 82, ground: 58 },
  { hour: "4 PM", canteen: 40, library: 76, gym: 66, lab: 68, study: 76, ground: 62 },
  { hour: "5 PM", canteen: 32, library: 64, gym: 58, lab: 44, study: 60, ground: 48 },
  { hour: "6 PM", canteen: 28, library: 49, gym: 48, lab: 26, study: 36, ground: 32 },
  { hour: "7 PM", canteen: 20, library: 34, gym: 37, lab: 12, study: 22, ground: 20 },
];

export const canteenTraffic = [
  { hour: "8 AM", people: 18 }, { hour: "9 AM", people: 26 }, { hour: "10 AM", people: 21 },
  { hour: "11 AM", people: 38 }, { hour: "12 PM", people: 92 }, { hour: "1 PM", people: 86 },
  { hour: "2 PM", people: 57 }, { hour: "3 PM", people: 42 }, { hour: "4 PM", people: 34 },
  { hour: "5 PM", people: 31 }, { hour: "6 PM", people: 45 }, { hour: "7 PM", people: 22 },
];

export const menuItems = [
  { name: "Paneer tikka bowl", detail: "Basmati rice · mint chutney", price: "₹120", tag: "Popular now", icon: "leaf" },
  { name: "Masala dosa", detail: "Crisp dosa · sambar & coconut chutney", price: "₹85", tag: "South Indian", icon: "sun" },
  { name: "Garden pesto sandwich", detail: "Grilled sourdough · seasonal greens", price: "₹95", tag: "Vegetarian", icon: "sandwich" },
  { name: "Mango lassi", detail: "Fresh mango · chilled yogurt", price: "₹45", tag: "Fresh today", icon: "cup-soda" },
];

export const defaultAlerts: AlertSubscription[] = [
  { id: "library", label: "Library Floor 3 has more than 10 free seats", enabled: true },
  { id: "canteen", label: "Canteen queue drops below 5 minutes", enabled: false },
  { id: "gym", label: "Gym occupancy falls below 50%", enabled: true },
];

export function crowdLevel(occupancy: number): CrowdLevel {
  if (occupancy < 45) return "free";
  if (occupancy < 75) return "moderate";
  return "crowded";
}

export function randomizePlaces(places: CampusPlace[], random = Math.random): CampusPlace[] {
  return places.map((place) => {
    const change = Math.round((random() - 0.5) * 12);
    const people = Math.max(0, Math.min(place.capacity, place.people + change));
    return { ...place, people };
  });
}

export function readStored<T>(storage: Pick<Storage, "getItem">, key: string, fallback: T): T {
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function toggleFavorite(favorites: string[], placeId: string): string[] {
  return favorites.includes(placeId)
    ? favorites.filter((id) => id !== placeId)
    : [...favorites, placeId];
}

export function persistFavorite(storage: Pick<Storage, "setItem">, favorites: string[]): void {
  storage.setItem("campusflow:favorites", JSON.stringify(favorites));
}

export function canReserveSeat(reservation: Reservation | null, duration: number, now = Date.now()): boolean {
  return reservation === null && [1, 2, 3].includes(duration) && Number.isFinite(now);
}

export function createReservation(floor: number, seat: number, duration: number, now = Date.now()): Reservation | null {
  if (![1, 2, 3].includes(duration) || floor < 1 || floor > 3 || seat < 1 || !Number.isFinite(now)) return null;
  return { floor, seat, startedAt: now, endsAt: now + duration * 60 * 60 * 1000 };
}

export function persistReservation(storage: Pick<Storage, "setItem" | "removeItem">, reservation: Reservation | null): void {
  if (reservation === null) storage.removeItem("campusflow:reservation");
  else storage.setItem("campusflow:reservation", JSON.stringify(reservation));
}

export function persistAlerts(storage: Pick<Storage, "setItem">, alerts: AlertSubscription[]): void {
  storage.setItem("campusflow:alerts", JSON.stringify(alerts));
}