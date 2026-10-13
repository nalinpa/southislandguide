# Fix: Wire the dead "New Itinerary" button on the Account screen

## File to change

`components/account/ItinerariesCard.tsx`

## Problem

The "New Itinerary" button at line 72 has `onPress={() => {}}` — tapping it does nothing. A GAP comment on lines 67–71 acknowledges this. The `CreateItineraryModal` component already exists and is used identically in two other screens (`app/(app)/(tabs)/itinerary/index.tsx` and `app/(app)/(tabs)/map/index.tsx`).

## Current code (for reference)

```tsx
// components/account/ItinerariesCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
```

Lines 64–76 (the dead button and its GAP comment):
```tsx
      {atLimit ? (
        <Text style={styles.limitText}>Up to {PLANNER.MAX_ITINERARIES} itineraries allowed.</Text>
      ) : (
        // GAP: RTR's original opens a CreateItineraryModal here. This
        // package doesn't template itinerary-CRUD UI (a bigger feature than
        // this profile shell) -- wire this onPress to your own
        // create-itinerary flow. See rotorua-guide's or aklguide's
        // CreateItineraryModal for a reference shape.
        <TouchableOpacity style={styles.createBtn} onPress={() => {}} activeOpacity={0.6}>
          <Plus size={13} color={tokens.colors.accent} strokeWidth={2.5} />
          <Text style={styles.createBtnText}>New Itinerary</Text>
        </TouchableOpacity>
      )}
```

## Reference pattern

This is how `itinerary/index.tsx` wires the same modal (lines 144–153):
```tsx
<CreateItineraryModal
  visible={isCreating}
  locked={!isEntitled}
  onClose={() => setIsCreating(false)}
  onCreated={(id) => {
    setIsCreating(false);
    if (id) router.replace(`/(app)/(tabs)/itinerary/${id}`);
  }}
  showTemplateOption
/>
```

## What to do

1. Add `useState` to the React import on line 2: `import React, { useState } from "react";`
2. Add an import for the modal: `import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";`
3. Inside the component, add state: `const [isCreating, setIsCreating] = useState(false);`
4. Delete the GAP comment (lines 67–71) entirely — it is no longer accurate.
5. Change the button's `onPress` from `() => {}` to `() => setIsCreating(true)`.
6. Wrap the entire return value in a React fragment (`<>...</>`), because you are about to add a sibling. The current return is a single `<View style={styles.section}>...</View>`.
7. After that closing `</View>`, before the fragment's `</>`, render the modal:
   ```tsx
   <CreateItineraryModal
     visible={isCreating}
     onClose={() => setIsCreating(false)}
     onCreated={(id) => {
       setIsCreating(false);
       if (id) router.push(`/(app)/(tabs)/itinerary/${id}`);
     }}
     showTemplateOption
   />
   ```
   Note: use `router.push` (not `router.replace` like the itinerary list), because the user is on the Account tab — replacing would destroy the account screen's stack.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — existing tests pass. If any test for `ItinerariesCard` mocks the component as a stub, the mock should already cover it; if not, add a mock for `CreateItineraryModal` in the test file following the pattern from `app/(app)/(tabs)/itinerary/__tests__/itineraryList.test.tsx` lines 9–22.
- Do not touch any file other than `components/account/ItinerariesCard.tsx` (and its test if needed).