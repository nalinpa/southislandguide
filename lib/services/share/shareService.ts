import { Share as RNShare } from "react-native";
import * as Sharing from "expo-sharing";
import * as Sentry from "@sentry/react-native";

import type { ShareResult } from "./types";

async function shareImageAsync(fileUri: string): Promise<boolean> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share",
        UTI: "public.png",
      });
      return true;
    }
  } catch (e) {
    Sentry.captureException(e);
  }

  try {
    await RNShare.share({ url: fileUri });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

export const shareService = {
  // ponytail: no delete after sharing. The card is a react-native-view-shot temp file in
  // tmp/ReactNative, which React Native empties on the first capture of each run
  // (RCTTempFilePath). Expo's legacy deleteAsync can't delete there anyway: outside the
  // caches and documents folders it refuses every path (Sentry 7835228824).
  async shareImageUriAsync(fileUri: string): Promise<ShareResult> {
    const ok = await shareImageAsync(fileUri);
    if (ok) return { ok: true, mode: "image", shared: true };
    return { ok: false, mode: "image", error: "Couldn't share." };
  },
};
