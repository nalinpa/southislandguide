// The opening tour's steps and words (docs/plans/opening-tour.md, "The steps").
// Copied in shape from Rotorua's lib/tour/tourSteps.ts.

// `free` is signed in without the unlock, `paid` with it, `guest` chose "Continue as Guest".
export type TourAudience = "guest" | "free" | "paid";

export type TourTabKey = "sites" | "itinerary" | "map" | "account";

export type TourStep = {
  id: string;
  // Moves to this tab when the step comes up.
  tabKey?: TourTabKey;
  // Opens the route a screen registered under this key (useTourStepRoute), for a step on
  // a screen that depends on what is loaded: here, the first place in Explore's list.
  routeKey?: string;
  // Who sees it. Everyone when left out.
  who?: TourAudience[];
  // Points at nothing: the card is centred with no cut-out (the trip preview, the map).
  // Every other step's id has a screen registering it with useTourTarget(id).
  noTarget?: boolean;
  // The dim's opacity, when the screen should show through more than usual.
  dim?: number;
  // The card's button, when it isn't Next (or Done on the last step).
  nextLabel?: string;
  // Skip Tour at the bottom of the screen, for a target where it usually sits (top right).
  skipAtBottom?: boolean;
  title: string;
  body: string;
};

// Steps without a tabKey or routeKey stay on the screen the step before landed on.
export const TOUR_STEPS: TourStep[] = [
  // Says it's a tour before the first cut-out appears (owner, 2026-10-30).
  {
    id: "welcome",
    tabKey: "sites",
    noTarget: true,
    nextLabel: "Start Tour",
    title: "Welcome to Kiwi Guide",
    body: "Here's a quick tour of how it works. It takes a minute, and you can skip it any time.",
  },
  {
    id: "town",
    title: "Pick a Town",
    body: "You start in the nearest town. Tap here to see another.",
  },
  // The guide button is top right, under where Skip Tour sits.
  {
    id: "guide",
    skipAtBottom: true,
    title: "Before You Go",
    body: "Driving, weather and safety, from people who live here.",
  },
  { id: "browse", title: "Browse by Type", body: "Walks, food, beaches and more. Search is up top." },
  { id: "place", title: "Tap a Place", body: "Photos, hours, directions and reviews, all in one place." },
  {
    id: "placeAdd",
    routeKey: "place",
    who: ["paid"],
    title: "Add It to a Trip",
    body: "Drop it into any day. We work out the drive.",
  },
  {
    id: "placeSave",
    routeKey: "place",
    who: ["free"],
    title: "Save It for Later",
    body: "Tap the heart to keep it on your list.",
  },
  {
    id: "trip",
    tabKey: "itinerary",
    noTarget: true,
    title: "Your Trip, Day by Day",
    body: "Each day's towns and the drives between, worked out for you.",
  },
  {
    id: "map",
    tabKey: "map",
    noTarget: true,
    dim: 0.4,
    title: "See It on the Map",
    body: "Every place around you. Tap a pin for details.",
  },
];

export function stepsFor(audience: TourAudience): TourStep[] {
  return TOUR_STEPS.filter((s) => !s.who || s.who.includes(audience));
}

export const TOUR_TAB_ROUTES: Record<TourTabKey, string> = {
  sites: "/(app)/(tabs)/sites",
  itinerary: "/(app)/(tabs)/itinerary",
  map: "/(app)/(tabs)/map",
  account: "/(app)/(tabs)/account",
};
