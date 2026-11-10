import { describe, expect, it } from "vitest";

import {
  canReserveSeat,
  createReservation,
  persistFavorite,
  persistReservation,
  readStored,
  toggleFavorite,
} from "@/lib/campusflow-data";

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: (key) => { entries.delete(key); },
    clear: () => { entries.clear(); },
    key: (index) => Array.from(entries.keys())[index] ?? null,
    get length() { return entries.size; },
  };
}

describe("CampusFlow local preferences", () => {
  it("stores favorite places and restores them", () => {
    const storage = memoryStorage();
    const favorites = toggleFavorite([], "library");

    persistFavorite(storage, favorites);

    expect(readStored(storage, "campusflow:favorites", [])).toEqual(["library"]);
  });

  it("removes an existing favorite when it is toggled again", () => {
    expect(toggleFavorite(["library", "gym"], "library")).toEqual(["gym"]);
  });

  it.each([1, 2, 3])("allows and stores a %i-hour reservation", (duration) => {
    const storage = memoryStorage();
    const reservation = createReservation(2, 7, duration, 1_000);

    expect(canReserveSeat(null, duration, 1_000)).toBe(true);
    expect(reservation?.endsAt).toBe(1_000 + duration * 60 * 60 * 1000);
    persistReservation(storage, reservation);
    expect(readStored(storage, "campusflow:reservation", null)).toEqual(reservation);
  });

  it("blocks a second reservation and rejects durations outside one to three hours", () => {
    expect(canReserveSeat({ floor: 1, seat: 1, startedAt: 0, endsAt: 1 }, 1, 0)).toBe(false);
    expect(createReservation(1, 1, 4, 1_000)).toBeNull();
  });

  it("removes a canceled reservation from local storage", () => {
    const storage = memoryStorage();
    persistReservation(storage, createReservation(1, 2, 1, 1_000));
    persistReservation(storage, null);

    expect(readStored(storage, "campusflow:reservation", null)).toBeNull();
  });
});