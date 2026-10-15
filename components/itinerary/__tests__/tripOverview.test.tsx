// The trip view: one row per day saying which town or towns it is in. The towns and the
// drives are worked out from the places (tripSummary), never chosen, so what is pinned
// here is how a day reads and that a row opens its day.
import React from "react";
import { ScrollView } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { TripOverview } from "@/components/itinerary/TripOverview";
import { packTrip } from "@/lib/utils/itineraryPhysics";
import { tokens } from "@/lib/ui/tokens";
import type { ItineraryItem } from "@/lib/models";

// "ghost" isn't in the place list. Christchurch to Dunedin is 9 slots (4.5 hours),
// Christchurch to Timaru 4, Timaru to Dunedin 5.
const AREA: Record<string, string> = {
  "chc-a": "christchurch",
  "chc-b": "christchurch",
  "tim-a": "timaru",
  "dun-a": "dunedin",
  "dun-b": "dunedin",
};
const places = (id: string) => (id in AREA ? { area: AREA[id] } : undefined);

const at = (id: string, siteId: string, over: Partial<ItineraryItem> = {}): ItineraryItem => ({
  id,
  siteId,
  siteName: id,
  slotIndex: 0,
  durationSlots: 2,
  timeLabel: "",
  durationLabel: "",
  ...over,
});

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Day 1 is Wed 14 Oct 2020 unless a date is given: a fixed past year, so no row is ever
// "today" by accident.
const show = (days: ItineraryItem[][], opts: { dates?: string[]; onOpenDay?: (id: string) => void } = {}) =>
  render(
    <TripOverview
      title="South Island Trip"
      days={packTrip(
        days.map((items, i) => ({ id: "day_" + (i + 1), date: opts.dates?.[i] ?? "2020-10-" + (14 + i), items })),
        places,
      )}
      places={places}
      imageFor={(area) => (area === "timaru" ? null : { uri: "img:" + area })}
      onOpenDay={opts.onOpenDay ?? jest.fn()}
    />,
  );

describe("TripOverview", () => {
  it("has a row for each day, with its number and its date", async () => {
    const view = await show([[at("a", "chc-a")], [at("b", "chc-b")]]);

    expect(view.getByText("Day 1 · Wed 14 Oct")).toBeTruthy();
    expect(view.getByText("Day 2 · Thu 15 Oct")).toBeTruthy();
  });

  it("names the towns in the order they are visited", async () => {
    const view = await show([[at("a", "chc-a"), at("b", "chc-b"), at("c", "dun-a")]]);

    expect(view.getByText("Christchurch → Dunedin")).toBeTruthy();
  });

  it("counts the places and adds up the driving between towns", async () => {
    const view = await show([[at("a", "dun-a"), at("b", "tim-a"), at("c", "chc-a")]]);

    expect(view.getByText("Dunedin → Timaru → Christchurch")).toBeTruthy();
    expect(view.getByText("3 places · 4.5 hours driving")).toBeTruthy();
  });

  it("says nothing of driving on a day in one town, and counts one place in the singular", async () => {
    const view = await show([[at("a", "chc-a"), at("b", "chc-b")], [at("c", "chc-a")]]);

    expect(view.getByText("2 places")).toBeTruthy();
    expect(view.getByText("1 place")).toBeTruthy();
    expect(view.queryByText(/driving/)).toBeNull();
  });

  // The planner doesn't know where the traveller sleeps, so a change of town overnight is
  // driven on the morning of the later day. This is where a user sees that for the trip.
  it("says when a day starts with the drive from the town before", async () => {
    const view = await show([[at("a", "chc-a")], [at("b", "dun-a")]]);

    expect(view.getByText("Dunedin")).toBeTruthy();
    expect(view.getByText("1 place · 4.5 hours driving")).toBeTruthy();
    expect(view.getAllByText("Starts with the drive from Christchurch")).toHaveLength(1);
  });

  // The traveller is still where the day before ended, so an empty day is in that town.
  it("says an empty day has nothing planned, in the town the day before ended in", async () => {
    const view = await show([[at("a", "chc-a")], []]);

    expect(view.getByText("Nothing planned yet")).toBeTruthy();
    expect(view.getAllByText("Christchurch")).toHaveLength(2);
  });

  it("names no town for an empty first day", async () => {
    const view = await show([[], [at("a", "chc-a")]]);

    expect(view.getByText("Nothing planned yet")).toBeTruthy();
    expect(view.getAllByText("Christchurch")).toHaveLength(1);
  });

  it("counts places it can't put in a town, without naming one", async () => {
    const view = await show([[at("a", "ghost"), at("b", "ghost-2")]]);

    expect(view.getByText("2 places")).toBeTruthy();
    expect(view.queryByText(/→|Christchurch|Dunedin|Timaru/)).toBeNull();
  });

  it("marks today's row, and only that one, in the highlight colour", async () => {
    const view = await show([[at("a", "chc-a")], [at("b", "chc-b")]], { dates: ["2020-01-01", localIso(new Date())] });

    expect(view.getAllByText("Today")).toHaveLength(1);
    expect(view.getByText("Today")).toHaveStyle({ color: tokens.colors.highlight });
  });

  it("warns when a day has more in it than fits before 10 PM", async () => {
    const view = await show([
      [at("a", "chc-a", { durationSlots: 12 }), at("b", "chc-b", { durationSlots: 12 }), at("c", "chc-a", { durationSlots: 6 })],
      [at("d", "chc-a")],
    ]);

    expect(view.getAllByText("Runs past 10 PM")).toHaveLength(1);
  });

  it("opens the day that was tapped", async () => {
    const onOpenDay = jest.fn();
    const view = await show([[at("a", "chc-a")], [at("b", "dun-a")]], { onOpenDay });

    await fireEvent.press(view.getByText("Day 2 · Thu 15 Oct"));

    expect(onOpenDay).toHaveBeenCalledWith("day_2");
  });

  it("reads each row to a screen reader as one button and one sentence", async () => {
    const view = await show([[at("a", "chc-a")], [at("b", "dun-a"), at("c", "dun-b"), at("d", "tim-a")], []]);

    expect(view.getAllByRole("button")).toHaveLength(3);
    expect(view.getByLabelText("Day 1, Wednesday 14 October, Christchurch, 1 place")).toBeTruthy();
    expect(
      view.getByLabelText(
        "Day 2, Thursday 15 October, Dunedin then Timaru, 3 places, 7 hours driving, starts with the drive from Christchurch",
      ),
    ).toBeTruthy();
    expect(view.getByLabelText("Day 3, Friday 16 October, Timaru, nothing planned yet")).toBeTruthy();
  });

  // Each day shows a picture of its town: the one it ends in, where the next day starts.
  describe("the town's picture", () => {
    const pictures = (view: any) => view.queryAllByTestId("day-image").map((i: any) => i.props.source.uri);

    it("shows the picture of the town the day is in", async () => {
      const view = await show([[at("a", "chc-a")]]);

      expect(pictures(view)).toEqual(["img:christchurch"]);
    });

    it("shows the town the day ends in when it is in two", async () => {
      const view = await show([[at("a", "chc-a"), at("b", "dun-a")]]);

      expect(pictures(view)).toEqual(["img:dunedin"]);
    });

    it("shows the town an empty day is in", async () => {
      const view = await show([[at("a", "dun-a")], []]);

      expect(pictures(view)).toEqual(["img:dunedin", "img:dunedin"]);
    });

    // Rows keep their shape when there's no picture to show.
    it("holds the picture's place when the town has none, or there is no town", async () => {
      const view = await show([[at("a", "tim-a")], [at("b", "ghost")]]);

      expect(pictures(view)).toEqual([]);
      expect(view.getAllByTestId("day-image-placeholder")).toHaveLength(2);
    });
  });

  // A trip can run three weeks or more: on the road, today is what matters.
  it("opens scrolled to today's row", async () => {
    const scrollTo = (ScrollView.prototype as any).scrollTo as jest.Mock;
    scrollTo.mockClear();
    const view = await show([[at("a", "chc-a")], [at("b", "chc-b")], [at("c", "chc-a")]], {
      dates: ["2020-01-01", "2020-01-02", localIso(new Date())],
    });

    await fireEvent(view.getByTestId("day-row-day_3"), "layout", { nativeEvent: { layout: { x: 16, y: 400, width: 343, height: 110 } } });

    expect(scrollTo).toHaveBeenCalledWith({ y: 400 - 16, animated: false });
  });
});

