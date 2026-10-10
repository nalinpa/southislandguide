import { createUI } from "@blacksands/ui";
import { createComponents, boundingRegionFrom } from "@blacksands/components";
import { formTokens, tokens } from "@/lib/ui/tokens";

export { boundingRegionFrom };

export const uiKit = createUI(tokens);
export const components = createComponents(tokens, uiKit);

// The shared forms, built from the form tokens rather than the app's: see the
// comment on formTokens. Use these, not components.AuthCard / ReviewModal.
const formComponents = createComponents(formTokens, createUI(formTokens));
export const AuthCard = formComponents.AuthCard;
export const ReviewModal = formComponents.ReviewModal;

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
