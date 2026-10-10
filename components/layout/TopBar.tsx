import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { AppIconButton, AppText, Row } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { LightStatusBar } from "@/components/layout/LightStatusBar";

type TopBarProps = {
  title: string;
  /** A back button to the left of the title (TopBarBack), for a screen that isn't a tab's root. */
  leading?: ReactNode;
  /** Icon buttons on the right of the title. Use AppIconButton variant="control" (white). */
  actions?: ReactNode;
  /** Extra rows under the title: a search field, a tab strip. */
  children?: ReactNode;
  /** The last child forms the bar's bottom edge (a tab strip), so skip the bottom padding. */
  flushBottom?: boolean;
  /** A smaller title that may wrap to two lines, for titles that are a phrase rather than a word. */
  compactTitle?: boolean;
};

// The brand bar at the top of a screen: deep teal (the login screen's colour)
// from the clock down, with the screen's title in white. It sits fixed above
// whatever scrolls. The screen must not add its own top inset: with <Screen>,
// pass padded={false} and style={{ paddingTop: 0 }}.
export function TopBar({ title, leading, actions, children, flushBottom, compactTitle }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + tokens.space.xs }, !flushBottom && styles.padBottom]}>
      <LightStatusBar />
      <Row align="center" gap="sm" style={styles.titleRow}>
        {leading}
        <AppText
          variant="h1"
          style={[styles.title, compactTitle && styles.titleCompact]}
          numberOfLines={compactTitle ? 2 : 1}
        >
          {title}
        </AppText>
        {actions ? <Row gap="xs">{actions}</Row> : null}
      </Row>
      {children}
    </View>
  );
}

// The bar's back button: a white chevron in a faint white disc, so it reads as
// a button on the teal. `label` is what a screen reader announces.
export function TopBarBack({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <AppIconButton
      icon={ChevronLeft}
      variant="control"
      onPress={onPress}
      accessibilityLabel={label}
      style={styles.back}
    />
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: tokens.colors.accentWarm, gap: tokens.space.xs },
  padBottom: { paddingBottom: tokens.space.sm },
  // minHeight matches an icon button, so a title with no actions sits at the
  // same height as one with them.
  titleRow: { paddingHorizontal: tokens.space.md, minHeight: 44 },
  // flex 1 pushes any actions to the right edge.
  title: { flex: 1, color: "#FFFFFF" },
  titleCompact: { fontSize: 24, lineHeight: 29 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
