import { createClient } from "@blacksands/client";
import { createItinerariesApi } from "@blacksands/client/itineraries";
import { getToken } from "./auth";
import type { Site } from "@/lib/models";

export const client = createClient<Site>("southislandguide", { getToken });
export const itinerariesApi = createItinerariesApi("southislandguide", { getToken });
