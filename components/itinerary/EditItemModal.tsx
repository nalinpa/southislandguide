import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { X, Minus, Plus, ExternalLink, Image as ImageIcon, Trash2, ArrowRight, Sparkles } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { PURCHASE_CHECK_MESSAGE_SHORT, FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { hooksBag } from "@/lib/hooksBag";
import { siteImage } from "@/lib/categoryImages";
import { slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";
import type { ItineraryItem } from "@/lib/models";

const MAX_NOTE_LEN = 280;

// The stop's photo, or its type's or category's default (lib/categoryImages.ts) when the
// place has none.
function ItemImage({ imageUrl, siteId }: { imageUrl?: string; siteId: string }) {
  const { location: site } = hooksBag.useLocation(imageUrl ? null : siteId);
  const source = siteImage(imageUrl || site?.imageThumbnailUrl || site?.imageUrl, site?.category?.[0], "full", siteId);
  if (!source) {
    return (
      <View style={styles.imagePlaceholder}>
        <ImageIcon color={tokens.colors.borderStrong} size={32} />
      </View>
    );
  }
  return <Image source={source} style={styles.image} contentFit="cover" />;
}

type DayOption = { id: string; label: string; full?: boolean };

type EditItemModalProps = {
  item: ItineraryItem | null;
  currentDayId: string;
  availableDays: DayOption[];
  onClose: () => void;
  onSave: (itemId: string, newDurationSlots: number, note: string) => void;
  onRemove: (itemId: string) => void;
  onMoveDay: (itemId: string, newDayId: string) => void;
  // Non-premium: show an unlock card in place of the day buttons. Inline rather than
  // opening PremiumFeatureModal, since iOS drops a Modal presented while this one dismisses.
  // onUnlock buys with this modal still up, so a failed or already-owned purchase has
  // somewhere to report — see PremiumFeatureModal. The card becomes the day buttons by
  // itself once the entitlement lands.
  moveLocked?: boolean;
  onUnlock?: () => void;
  // Entitlements are `unknown`: the row asks for a re-check rather than a second purchase.
  moveUnverified?: boolean;
  onRecheck?: () => void;
};

export function EditItemModal({
  item,
  currentDayId,
  availableDays,
  onClose,
  onSave,
  onRemove,
  onMoveDay,
  moveLocked = false,
  onUnlock,
  moveUnverified = false,
  onRecheck,
}: EditItemModalProps) {
  const [draftDuration, setDraftDuration] = useState(2);
  const [draftNote, setDraftNote] = useState("");
  const [isMovingDay, setIsMovingDay] = useState(false);
  // See PremiumFeatureModal: a failed unlock from here used to be invisible.
  const { error: purchaseError } = usePurchaseContext();

  useEffect(() => {
    if (item) {
      setDraftDuration(item.durationSlots || 2);
      setDraftNote(item.note ?? "");
      setIsMovingDay(false);
    }
  }, [item]);

  const adjustDuration = (amount: number) => {
    setDraftDuration((prev) => Math.max(1, Math.min(PLANNER.MAX_GRID_SLOTS, prev + amount)));
  };

  const handleSave = () => {
    if (item) onSave(item.id, draftDuration, draftNote.trim());
  };

  const handleRemove = () => {
    if (!item) return;
    Alert.alert("Remove from Trip", `Remove ${item.siteName} from your trip?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemove(item.id) },
    ]);
  };

  const handleMove = (newDayId: string) => {
    if (!item || isMovingDay) return;
    setIsMovingDay(true);
    handleSave();
    onMoveDay(item.id, newDayId);
  };

  const handleViewDetails = () => {
    if (!item) return;
    onClose();
    // After the sheet's close has started; InteractionManager is gone in RN 0.88.
    requestIdleCallback(() => {
      router.push(`/(app)/(tabs)/sites/${item.siteId.trim()}`);
    });
  };

  if (!item) return null;

  const otherDays = availableDays.filter((d) => d.id !== currentDayId && !d.full);

  return (
    <Modal visible={!!item} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <CardShell status="basic" style={styles.modalContent}>
              <View style={styles.imageContainer}>
                <ItemImage imageUrl={item.imageUrl} siteId={item.siteId} />
                <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <X color={tokens.colors.text} size={16} strokeWidth={2.25} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.titleRow}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {item.siteName}
                  </Text>
                  <TouchableOpacity
                    style={styles.detailLink}
                    onPress={handleViewDetails}
                    accessibilityRole="button"
                    accessibilityLabel="View place details"
                  >
                    <Text style={styles.detailText}>Details</Text>
                    <ExternalLink color={tokens.colors.highlight} size={14} strokeWidth={2.25} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlSection}>
                <Text style={styles.modalLabel}>Planned Duration</Text>
                <View style={styles.durationControl}>
                  <TouchableOpacity
                    style={styles.durationBtn}
                    onPress={() => adjustDuration(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Shorter"
                  >
                    <Minus color={tokens.colors.text} size={20} />
                  </TouchableOpacity>
                  <Text style={styles.durationValue}>{slotsToDurationLabel(draftDuration)}</Text>
                  <TouchableOpacity
                    style={styles.durationBtn}
                    onPress={() => adjustDuration(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Longer"
                  >
                    <Plus color={tokens.colors.text} size={20} />
                  </TouchableOpacity>
                </View>
                {/* A tap on a place opens this sheet, which has no time control: where people look. */}
                <Text style={styles.durationHint}>To change the time, hold the place on the day and drag it.</Text>
              </View>

              <View style={styles.controlSection}>
                <Text style={styles.modalLabel}>Note</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note for this stop (optional)"
                  placeholderTextColor={tokens.colors.textMuted}
                  value={draftNote}
                  onChangeText={(t) => setDraftNote(t.slice(0, MAX_NOTE_LEN))}
                  multiline
                  numberOfLines={3}
                  maxLength={MAX_NOTE_LEN}
                />
              </View>

              {otherDays.length > 0 && (
                <View style={styles.moveSection}>
                  <View style={styles.moveLabelWrap}>
                    <Text style={styles.modalLabel}>Move to another day?</Text>
                  </View>
                  {moveLocked ? (
                    <>
                      <TouchableOpacity style={styles.lockedMove} onPress={moveUnverified ? onRecheck : onUnlock} activeOpacity={0.7}>
                        <Sparkles color={tokens.colors.selected} size={18} />
                        <Text style={styles.lockedMoveText}>
                          {moveUnverified ? PURCHASE_CHECK_MESSAGE_SHORT : "Moving stops between days is a Premium feature"}
                        </Text>
                        <Text style={styles.lockedMoveCta}>{moveUnverified ? "Retry" : "Unlock"}</Text>
                      </TouchableOpacity>
                      {purchaseError?.productId === FULL_GUIDE_PRODUCT_ID && (
                        <Text style={styles.lockedMoveError}>{purchaseError.message}</Text>
                      )}
                    </>
                  ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveScroll}>
                    {otherDays.map((day) => (
                      <TouchableOpacity
                        key={day.id}
                        style={[styles.moveBtn, isMovingDay && styles.moveBtnDisabled]}
                        onPress={() => handleMove(day.id)}
                        disabled={isMovingDay}
                      >
                        <ArrowRight color={tokens.colors.text2} size={16} />
                        <Text style={styles.moveBtnText}>{day.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.actionContainer}>
                <AppButton variant="primary" onPress={handleSave}>
                  Save Changes
                </AppButton>
                <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                  <Trash2 color={tokens.colors.danger} size={18} />
                  <Text style={styles.removeText}>Remove from Trip</Text>
                </TouchableOpacity>
              </View>
            </CardShell>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  lockedMoveError: { fontSize: 13, color: tokens.colors.danger, paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.sm },
  keyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: tokens.colors.dim, justifyContent: "flex-end" },
  // A sheet on the bottom edge with 20pt top corners, not a floating card (the design
  // sweep's look: docs/plans/design-sweep.md). No grab handle: it doesn't drag.
  // ponytail: 34 is the home indicator's space on a Face ID iPhone, as a fixed number. On
  // a phone with none (an SE) it is spare padding. Read the real inset if that matters.
  modalWrapper: {},
  modalContent: {
    padding: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  imageContainer: { height: 150, width: "100%", position: "relative", backgroundColor: tokens.colors.bgElevated },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  // An x in a circle of the page's colour, over the photo.
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.page,
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: { padding: tokens.space.md, paddingBottom: 0 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2, flex: 1, marginRight: tokens.space.md, color: tokens.colors.text },
  // A link to push, so it's orange (docs/plans/design-sweep.md), and plain: no tinted chip.
  detailLink: { flexDirection: "row", alignItems: "center", paddingTop: 3 },
  detailText: { fontSize: 15, fontWeight: "500", color: tokens.colors.highlight, marginRight: 4 },
  controlSection: { paddingHorizontal: tokens.space.md },
  modalLabel: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2, marginTop: 18, marginBottom: tokens.space.xs },
  // As the stepper on Add to Trip: round buttons close either side of the value.
  durationControl: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: tokens.space.md },
  durationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.page,
  },
  durationValue: { minWidth: 104, textAlign: "center", fontSize: 17, fontWeight: "600", color: tokens.colors.text },
  durationHint: { marginTop: tokens.space.xs, fontSize: 13, textAlign: "center", color: tokens.colors.textMuted },
  noteInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: tokens.space.sm,
    fontSize: 16,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.page,
    minHeight: 72,
    textAlignVertical: "top",
  },
  moveSection: {},
  // Inset on the label only — the day row keeps its own padding so it can scroll
  // edge to edge rather than clipping at a container inset.
  moveLabelWrap: { paddingHorizontal: tokens.space.md },
  moveScroll: { paddingHorizontal: tokens.space.md, gap: 8 },
  moveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.page,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  moveBtnDisabled: { opacity: 0.5 },
  lockedMove: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.accentDim,
  },
  lockedMoveText: { flex: 1, fontSize: 13, fontWeight: "600", color: tokens.colors.text },
  lockedMoveCta: { fontSize: 13, fontWeight: "800", color: tokens.colors.selected },
  moveBtnText: { fontSize: 15, fontWeight: "500", color: tokens.colors.text, marginLeft: 6 },
  actionContainer: { paddingHorizontal: tokens.space.md, paddingTop: 18, paddingBottom: 34 },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: tokens.space.sm, paddingVertical: tokens.space.sm },
  removeText: { fontSize: 15, fontWeight: "600", color: tokens.colors.danger, marginLeft: 8 },
});
