// The website's trip builder, run in the app. builder.js and the data are copies of the site's files
// (scripts/copy-site-builder.mjs). The three things the builder asks of `pack` are the app's own code, the same
// three the site's pack.js bundles, so the app and the website build the same trips
// (lib/__tests__/tripBuilder.test.ts).
import hubs from "@/assets/data/area-hubs.json";
import data from "@/assets/data/builder-data.json";
import { packTrip } from "@/lib/utils/itineraryPhysics";
import { getLeg } from "@/lib/utils/transitMatrix";

/** The quiz's answers, as the copied quiz logic's answersFor gives them. */
export type BuilderAnswers = {
  /** A start town's id ("christchurch"). */
  start: string;
  /** The finish town. The start town for a loop; left out to finish anywhere. */
  end?: string | null;
  days: number;
  pace: "easy" | "some" | "hikes";
  /** The most driving in a day, in minutes. */
  drive: 120 | 240 | 360;
  vibes: string[];
  into: string[];
  food: boolean;
  activities: string[];
};

export type BuiltStop = {
  siteId: string;
  siteName: string;
  slotIndex: number;
  durationSlots: number;
  timeLabel: string;
  durationLabel: string;
};
export type BuiltDay = {
  /** The town the day ends in. */
  town: string;
  /** The day block the day came from ("rest-<town>": a rest day). */
  block: string;
  items: BuiltStop[];
  /** Not there on a free day. */
  driveMinutes?: number;
  /** A day with no stops. */
  free?: true;
  /** More driving than the answers' limit. */
  overLimit?: true;
};
export type BuiltTrip = {
  /** "suggested": one of the app's suggested trips that fits. "built": strung together for these answers. */
  kind: "suggested" | "built";
  key: string;
  label: string;
  start: string;
  end: string;
  days: BuiltDay[];
  /** The activities asked for that the trip couldn't fit. */
  missing: string[];
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("./builder") as { buildTrips: (data: unknown, pack: unknown, ans: BuilderAnswers) => BuiltTrip[] };
const pack = { packTrip, getLeg, hubs };

/**
 * Up to three trips for these answers: the app's suggested trips that fit, then the built ones.
 * About 0.3 s at worst on an iPhone XR (docs/plans/app-trip-builder.md, stage 0).
 */
export function buildTrips(ans: BuilderAnswers): BuiltTrip[] {
  return site.buildTrips(data, pack, ans);
}
