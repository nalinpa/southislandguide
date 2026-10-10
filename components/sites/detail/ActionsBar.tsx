// components/sites/detail/ActionsBar.tsx
import { View, StyleSheet, Pressable } from "react-native";
import { MapPin, MessageSquarePlus, Camera, Heart, Navigation, Share2 } from "lucide-react-native";

import { AppText, AppButton, RatingStars, Row, Stack } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type ActionsBarProps = {
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
  onShareBonus: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
};

// Each action is an icon in a disc with its name under it. Three looks:
// - primary: the one most people came for, solid teal;
// - active: something the user has already done here (saved, reviewed,
//   shared), in the highlight colour;
// - otherwise the brand mint, with a teal icon.
function QuickAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  active,
  primary,
  fillWhenActive,
}: {
  icon: typeof MapPin;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  /** Only for outline icons that read as "on" when filled, like the heart. */
  fillWhenActive?: boolean;
}) {
  const iconColor = active ? tokens.colors.highlight : primary ? "#FFFFFF" : tokens.colors.accent;
  const discColor = active ? tokens.colors.highlightDim : primary ? tokens.colors.accent : tokens.colors.bgElevated;
  const labelColor = active ? tokens.colors.highlight : tokens.colors.text2;
  return (
    <Pressable
      style={styles.quickAction}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
    >
      <View style={[styles.quickDisc, { backgroundColor: discColor }]}>
        <Icon size={22} color={iconColor} fill={active && fillWhenActive ? iconColor : "none"} />
      </View>
      <AppText style={[styles.quickActionLabel, { color: labelColor }]}>{label}</AppText>
    </Pressable>
  );
}

export function QuickActions({
  onDirections,
  onOpenReview,
  hasReview,
  onShareBonus,
  shareBonus,
  isSaved,
  onToggleSave,
}: {
  onDirections: () => void;
  onOpenReview: () => void;
  hasReview: boolean;
  onShareBonus: () => void;
  shareBonus: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <Row justify="space-between" gap="sm" style={styles.quickRow}>
      <QuickAction icon={Navigation} label="Directions" onPress={onDirections} primary />
      <QuickAction icon={MessageSquarePlus} label={hasReview ? "Reviewed" : "Review"} onPress={onOpenReview} active={hasReview} />
      <QuickAction
        icon={Share2}
        label={shareBonus ? "Shared" : "Share"}
        onPress={onShareBonus}
        disabled={shareBonus}
        active={shareBonus}
      />
      <QuickAction
        icon={Heart}
        label={isSaved ? "Saved" : "Save"}
        onPress={onToggleSave}
        active={isSaved}
        fillWhenActive
      />
    </Row>
  );
}

export function ActionsBar({
  hasReview,
  myReviewRating,
  myReviewText,
  onOpenReview,
  onShareBonus,
  isSaved,
  onToggleSave,
}: ActionsBarProps) {
  return (
    <Stack gap="md">
      <Row justify="flex-end">
        <AppButton variant={isSaved ? "success" : "ghost"} size="sm" icon={Heart} onPress={onToggleSave}>
          {isSaved ? "Saved" : "Save"}
        </AppButton>
      </Row>

      <View style={styles.card}>
        <Stack gap="lg">
          <View style={styles.innerBox}>
            <Stack gap="sm">
              <Row justify="space-between" align="center">
                <Row gap="xs" align="center">
                  <MessageSquarePlus size={15} color={tokens.colors.accent} />
                  <AppText variant="label">Your Experience</AppText>
                </Row>
                {hasReview && <RatingStars rating={myReviewRating ?? 0} size={14} />}
              </Row>
              {!hasReview ? (
                <AppButton variant="ghost" size="sm" onPress={onOpenReview}>
                  {"+ Log your review & rating"}
                </AppButton>
              ) : (
                <AppText style={styles.reviewText}>
                  {`"${myReviewText?.trim() || "No written note provided."}"`}
                </AppText>
              )}
            </Stack>
          </View>

          <Stack gap="sm">
            <AppText variant="label">Share</AppText>
            <AppButton variant="primary" onPress={onShareBonus} icon={Camera}>
              Share a Photo
            </AppButton>
          </Stack>
        </Stack>
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  // No box round the row: the discs are what make the actions stand out on the
  // white sheet. (It used to be a white panel in a 2px dark outline, which was
  // the heaviest thing on the page.)
  quickRow: { paddingVertical: tokens.space.xs },
  quickAction: { flex: 1, alignItems: "center", gap: 6 },
  quickDisc: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgCard,
    padding: tokens.space.md,
  },
  innerBox: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
  reviewText: { color: tokens.colors.text2, fontStyle: "italic" },
});
