import { createElement, type ComponentProps } from "react";
import { createUI } from "@blacksands/ui";
import { createComponents, boundingRegionFrom } from "@blacksands/components";
import { DARK_READY, formTokens, tokens } from "@/lib/ui/tokens";

export { boundingRegionFrom };

export const uiKit = createUI(tokens);
export const components = createComponents(tokens, uiKit);

// The shared forms, built from the form tokens rather than the app's: see the
// comment on formTokens. Use these, not components.AuthCard / ReviewModal.
const formComponents = createComponents(formTokens, createUI(formTokens));
export const AuthCard = formComponents.AuthCard;
// The login screen's form (docs/plans/login-redesign.md): the engine's card-less one.
export const AuthPanel = formComponents.AuthPanel;
export const ReviewModal = formComponents.ReviewModal;

// The design sweep's look (docs/plans/design-sweep.md) as the default of each kit piece
// that takes it as props (@blacksands/ui 0.7), so no screen has to ask. A prop a screen
// does pass still wins.
// 12pt corners, 50pt tall (44 at "sm"), a semi-bold label, no glow.
export function AppButton({ shape, ...props }: ComponentProps<typeof uiKit.AppButton>) {
  const sm = props.size === "sm";
  return createElement(uiKit.AppButton, {
    ...props,
    shape: { radius: 12, height: sm ? 44 : 50, labelSize: sm ? 15 : 16, labelWeight: "600", shadow: false, ...shape },
  });
}

// Flat on the page, with the same button.
export function ErrorCard(props: ComponentProps<typeof uiKit.ErrorCard>) {
  return createElement(uiKit.ErrorCard, {
    flat: true,
    buttonShape: { radius: 12, height: 50, labelSize: 16, labelWeight: "600", shadow: false },
    ...props,
  });
}

export function LoadingState(props: ComponentProps<typeof uiKit.LoadingState>) {
  return createElement(uiKit.LoadingState, { color: tokens.colors.selected, labelColor: tokens.colors.textMuted, ...props });
}

// The white page. A screen not yet restyled passes background={tokens.colors.bgBase}.
// The clock and battery: the engine's default is dark, for a white page. With dark mode on
// they follow the phone, as the page does ("default" is iOS's own "follow the phone",
// @blacksands/ui 0.7.1). Not before: a dark phone would get a white clock on the white page.
export function Screen(props: ComponentProps<typeof uiKit.Screen>) {
  return createElement(uiKit.Screen, {
    background: tokens.colors.page,
    statusBarStyle: DARK_READY ? "default" : "dark-content",
    ...props,
  });
}

export const {
  AppText,
  AppIcon,
  AppIconButton,
  CardShell,
  Pill,
  Row,
  Stack,
  Section,
  RatingStars,
  OfflineBanner,
  CheckInAction,
} = uiKit;
