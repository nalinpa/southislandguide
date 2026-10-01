// Curated trip templates offered in CreateItineraryModal's picker. Empty until
// there is enough content to build one: a template's slotIndex/durationSlots
// are pre-baked against the real transit matrix, so writing them before the
// site list and matrix exist means re-baking them afterwards.
//
// See rotorua-guide/lib/itineraryTemplates.ts for the reference shape.

export type ItineraryTemplateItem = {
  siteId: string;
  siteName: string;
  slotIndex: number;
  durationSlots: number;
};

export type ItineraryTemplateDay = {
  items: ItineraryTemplateItem[];
};

export type ItineraryTemplate = {
  key: string;
  label: string;
  description: string;
  days: ItineraryTemplateDay[];
  free?: boolean;
};

export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [];

// The template key to preselect in the picker. With no templates and no paid
// unlock, always "Blank".
export function defaultTemplateKey(_locked: boolean): string | null {
  return null;
}
