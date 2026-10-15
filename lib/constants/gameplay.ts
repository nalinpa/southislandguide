export const PLANNER = {
  // Height of one 30-minute slot in pixels — must stay in sync with the timeline grid
  SLOT_HEIGHT: 72,
  // Total 30-min slots from 8:00 AM to 10:00 PM
  MAX_GRID_SLOTS: 28,
  MAX_ITINERARIES: 3,
  // The longest trip: what the api accepts (MAX_DAYS in enginev1/api/src/lib/itinerary.ts).
  MAX_TRIP_DAYS: 60,
} as const;
