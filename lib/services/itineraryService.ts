import { itinerariesApi } from "@/lib/api";
import type { Itinerary } from "@/lib/models";

export const itineraryService = {
  async getMyItineraries(): Promise<Itinerary[]> {
    const { itineraries } = await itinerariesApi.list();
    return itineraries;
  },
  async saveItinerary(itin: Partial<Itinerary>): Promise<string> {
    if (itin.id) {
      const { itinerary } = await itinerariesApi.update(itin.id, itin);
      return itinerary.id;
    }
    // The start town only when there is one: the engine client's type doesn't know it yet, and the api keeps it.
    const input = {
      title: itin.title,
      startDate: itin.startDate!,
      endDate: itin.endDate!,
      days: itin.days,
      ...(itin.startArea !== undefined ? { startArea: itin.startArea } : null),
    };
    const { itinerary } = await itinerariesApi.create(input);
    return itinerary.id;
  },
  async deleteItinerary(id: string): Promise<void> {
    await itinerariesApi.remove(id);
  },
};
