// components/sites/detail/ActionsBar.tsx
import { View, StyleSheet, Pressable } from "react-native";
import { MapPin, MessageSquarePlus, Camera, Heart, Navigation, Share2 } from "lucide-react-native";

import { AppText, AppButton, RatingStars, Row, Stack } from "@/lib/uiKit";
import { cardLift, tokens } from "@/lib/ui/tokens";
import type { TourTarget } from "@/lib/tour/useTourTarget";

type ActionsBarProps = {
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
  onShareBonus: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
};

// One cell of the action bar: a teal icon over its name. Something the user has
// already done here (saved, reviewed, shared) takes the highlight instead.
function QuickAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  active,
  divided,
  fillWhenActive,
  tourTarget,
}: {
  icon: typeof MapPin;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  /** Draws the hairline between this cell and the one before it. */
  divided?: boolean;
  /** Only for outline icons that read as "on" when filled, like the heart. */
  fillWhenActive?: boolean;
  /** The opening tour's target (useTourTarget), when a step points at this cell. */
  tourTarget?: TourTarget;
}) {
  const color = active ? tokens.colors.highlight : tokens.colors.accent;
  return (
    <Pressable
      {...tourTarget}
      style={[styles.quickAction, divided && styles.quickActionDivided]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Icon size={26} color={color} fill={active && fillWhenActive ? color : "none"} strokeWidth={2.1} />
      <AppText style={[styles.quickActionLabel, active && styles.quickActionLabelActive]}>{label}</AppText>
    </Pressable>
  );
}

export function QuickActions({
  onDirections,
  onOpenReview,
  hasReview,
  onShare,
  isSaved,
  onToggleSave,
  saveTarget,
}: {
  onDirections: () => void;
  onOpenReview: () => void;
  hasReview: boolean;
  onShare: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  /** The opening tour's target (useTourTarget) for the heart. */
  saveTarget?: TourTarget;
}) {
  return (
    <View style={styles.quickRow} accessibilityRole="toolbar">
      <QuickAction icon={Navigation} label="Directions" onPress={onDirections} />
      <QuickAction
        icon={MessageSquarePlus}
        label={hasReview ? "Reviewed" : "Review"}
        onPress={onOpenReview}
        active={hasReview}
        divided
      />
      {/* Any time, as often as they like (owner, 2026-10-20). It used to lock to a
          highlighted "Shared" after the first share, the template's share-bonus mechanic. */}
      <QuickAction icon={Share2} label="Share" onPress={onShare} divided />
      <QuickAction
        icon={Heart}
        label={isSaved ? "Saved" : "Save"}
        onPress={onToggleSave}
        active={isSaved}
        divided
        fillWhenActive
        tourTarget={saveTarget}
      />
    </View>
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
  // The page's action bar: one white card raised off the white sheet, four
  // equal cells split by hairlines. It stands out by being the only raised
  // surface on the page. Earlier tries: a 2px dark outline, loose discs, and a
  // solid teal panel, each heavier than the page around it.
  // No overflow: "hidden": on iOS that would clip the card's own shadow.
  // A much deeper shadow than an ordinary card's (cardLift is 0.12): white on
  // white, the shadow is what makes this read as a bar, and at card strength it
  // barely showed.
  quickRow: {
    flexDirection: "row",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...cardLift,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 10,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 18 },
  quickActionDivided: { borderLeftWidth: 1, borderLeftColor: tokens.colors.borderSubtle },
  quickActionLabel: { fontSize: 13, fontWeight: "700", color: tokens.colors.text, letterSpacing: 0.1 },
  quickActionLabelActive: { color: tokens.colors.highlight },
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
