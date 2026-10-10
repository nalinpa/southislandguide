import { createUI } from "@blacksands/ui";
import { createComponents, boundingRegionFrom } from "@blacksands/components";
import { formTokens, tokens } from "@/lib/ui/tokens";

export { boundingRegionFrom };

export const uiKit = createUI(tokens);
export const components = createComponents(tokens, uiKit);

// The sign-in card, built from the form tokens rather than the app's: see the
// comment on formTokens. Use this, not components.AuthCard.
export const AuthCard = createComponents(formTokens, createUI(formTokens)).AuthCard;

export const {
  AppButton,
  AppText,
  AppIcon,
  AppIconButton,
  CardShell,
  Pill,
  Row,
  Stack,
  Section,
  ErrorCard,
  LoadingState,
  RatingStars,
  OfflineBanner,
  CheckInAction,
  Screen,
} = uiKit;
