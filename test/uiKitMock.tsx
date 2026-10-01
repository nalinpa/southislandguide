// Shared stand-in for @/lib/uiKit, used as:
//
//   jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
//
// The real module builds @blacksands/ui and @blacksands/components, which pull in
// reanimated and react-native-worklets — a native runtime jest has no business booting.
// These stand-ins keep what tests assert on: visible text, press handlers, disabled
// state, and the `style` prop.
//
// Shared components (@blacksands/*) are tested where they live, so each one here is only
// as faithful as the screens' use of it needs: labels in, callbacks out. `components`
// carries only the ones south-island's screens render (no RequirePurchaseCard: 1.0 has no
// commerce).
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Any = any;

const wrap = ({ children, style }: Any) => React.createElement(View, { style }, children);

export function pressable(label: Any, onPress: Any, disabled?: boolean) {
  return React.createElement(
    TouchableOpacity,
    { onPress, disabled, accessibilityRole: "button" },
    React.createElement(Text, null, label),
  );
}

const text = ({ children, style }: Any) => React.createElement(Text, { style }, children);

export const AppText = text;
export const AppButton = ({ children, onPress, disabled }: Any) => pressable(children, onPress, disabled);
export const AppIcon = () => null;
// Icon-only, so its accessibilityLabel is the only way a test can find it — keep it on the
// pressable itself rather than turning it into visible text.
export const AppIconButton = ({ onPress, disabled, accessibilityLabel }: Any) =>
  React.createElement(TouchableOpacity, {
    onPress,
    disabled,
    accessibilityRole: "button",
    accessibilityLabel,
  });
// Some screens make the whole card the tap target, so honour onPress when it's there, and
// some pass a `header` node that carries visible text.
export const CardShell = ({ children, style, onPress, header }: Any) =>
  onPress
    ? React.createElement(TouchableOpacity, { onPress, style, accessibilityRole: "button" }, header, children)
    : React.createElement(View, { style }, header, children);
export const Pill = ({ label, children }: Any) => React.createElement(Text, null, label ?? children);
export const Row = wrap;
export const Stack = wrap;
export const Section = ({ title, children }: Any) =>
  React.createElement(View, null, title ? React.createElement(Text, null, title) : null, children);
export const Screen = wrap;
export const ErrorCard = ({ title, message, action, secondaryAction }: Any) =>
  React.createElement(
    View,
    null,
    React.createElement(Text, null, title),
    message ? React.createElement(Text, null, message) : null,
    action ? pressable(action.label, action.onPress) : null,
    secondaryAction ? pressable(secondaryAction.label, secondaryAction.onPress) : null,
  );
export const LoadingState = ({ label }: Any) => React.createElement(Text, null, label ?? "Loading");
export const RatingStars = ({ rating }: Any) => React.createElement(Text, null, "Rated " + rating);
export const OfflineBanner = ({ visible }: Any) => (visible ? React.createElement(Text, null, "Offline") : null);
export const CheckInAction = () => null;

export const uiKit = {
  AppText,
  AppButton,
  AppIcon,
  AppIconButton,
  CardShell,
  Pill,
  Row,
  Stack,
  Section,
  Screen,
  ErrorCard,
  LoadingState,
  RatingStars,
  OfflineBanner,
  CheckInAction,
};

export const components = {
  AuthCard: ({ title, err, notice, busy, email, password, confirm, mode, canSubmit, onChangeMode, onChangeEmail, onChangePassword, onChangeConfirm, onSubmit, onGuest, labels }: Any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      err ? React.createElement(Text, null, err) : null,
      notice ? React.createElement(Text, null, notice) : null,
      busy ? React.createElement(Text, null, "Busy") : null,
      React.createElement(TextInput, { placeholder: "Email", value: email, onChangeText: onChangeEmail }),
      React.createElement(TextInput, { placeholder: "Password", value: password, onChangeText: onChangePassword }),
      React.createElement(TextInput, { placeholder: "Confirm", value: confirm, onChangeText: onChangeConfirm }),
      pressable("Submit " + mode, onSubmit, !canSubmit),
      pressable("Switch to signup", () => onChangeMode("signup")),
      pressable("Switch to reset", () => onChangeMode("reset")),
      pressable(labels?.continueAsGuest ?? "Continue as Guest", onGuest),
    ),
  ReviewsSummaryCard: ({ ratingCount, avgRating, onViewAll, onAddReview }: Any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, "Reviews (" + ratingCount + ")"),
      React.createElement(Text, null, "Average " + avgRating),
      pressable("View All", onViewAll),
      pressable("Add Review", onAddReview),
    ),
  ReviewModal: ({ visible, saving, onSave, onClose }: Any) =>
    visible
      ? React.createElement(
          View,
          null,
          React.createElement(Text, null, saving ? "Saving Review" : "Review Modal"),
          pressable("Save Review", onSave),
          pressable("Close Review", onClose),
        )
      : null,
  ReviewListItem: ({ reviewId, authorId, authorName, text: body, rating, optionsMenu: Menu }: Any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, authorName),
      React.createElement(Text, null, body),
      React.createElement(Text, null, "Rated " + rating),
      Menu ? React.createElement(Menu, { reviewId, authorId, authorName }) : null,
    ),
  // The real menu decides for itself whether the viewer is a guest; the stand-in exposes
  // all three outcomes so a screen's handling of each can be driven directly.
  ReviewOptionsMenu: ({ reviewId, authorId, authorName, onReport, onBlock, onGuestBlocked }: Any) =>
    React.createElement(
      View,
      null,
      pressable("Report " + authorName, () => onReport({ reviewId, authorId })),
      pressable("Block " + authorName, () => onBlock({ blockedUid: authorId })),
      pressable("Guest blocked " + authorName, onGuestBlocked),
    ),
  ReviewsEmptyState: ({ title, body, onBack, onRetry }: Any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title ?? "No reviews yet"),
      body ? React.createElement(Text, null, body) : null,
      pressable("Go Back", onBack),
      onRetry ? pressable("Retry", onRetry) : null,
    ),
  ReviewsHeader: ({ title, count, avg, onBack }: Any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, count + " reviews"),
      React.createElement(Text, null, "Average " + avg),
      pressable("Back", onBack),
    ),
  TripChoiceSheet: ({ visible, onAddToExisting, onCreateNew, onClose }: Any) =>
    visible
      ? React.createElement(
          View,
          null,
          pressable("Add to Existing", onAddToExisting),
          pressable("Create New", onCreateNew),
          pressable("Close Trip Choice", onClose),
        )
      : null,
  EmptyItineraryState: ({ description, createLabel, browseLabel, onCreateNew, onBrowse }: Any) =>
    React.createElement(
      View,
      null,
      description ? React.createElement(Text, null, description) : null,
      pressable(createLabel ?? "Create", onCreateNew),
      pressable(browseLabel ?? "Browse", onBrowse),
    ),
  Day: ({ label, children }: Any) =>
    React.createElement(View, null, label ? React.createElement(Text, null, label) : null, children),
  TimelineBlock: ({ children }: Any) => React.createElement(View, null, children),
  TransitBlock: ({ label, children }: Any) =>
    React.createElement(View, null, label ? React.createElement(Text, null, label) : null, children),
};

export const boundingRegionFrom = () => null;
